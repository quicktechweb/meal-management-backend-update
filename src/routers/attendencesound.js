const express = require("express");
const axios = require("axios");
const Attendance = require("../../src/models/Attendance");

const router = express.Router();

// 📱 MOBILE ALERT FLAG —
let mobileAlertPending = false;
let lastMobileAlertUser = null;
let lastMobileAlertName = null;
let lastMobileAlertType = null; // "meal_found" | "no_meal"

// 📋 DEBUG LOG — সব কিছু এখানে জমা হবে (সর্বোচ্চ ১০০টা এন্ট্রি রাখা হবে)
const debugLog = [];
function addLog(event, data = {}) {
  debugLog.unshift({
    time: new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" }),
    event,
    ...data,
  });
  if (debugLog.length > 100) debugLog.pop();
}

// ⏱️ external API call — slow/hanging server যেন পুরো ফ্লো আটকে না রাখে
const MEAL_API_TIMEOUT_MS = 4000;
const mealApi = axios.create({ timeout: MEAL_API_TIMEOUT_MS });

// 🔥 RAW BODY READER (ZKT device support)
router.use((req, res, next) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", () => {
    req.rawBody = body;
    next();
  });
});

// 🧠 TIME CHECK HELPER
function isTimeBetween(checkTime, startTime, endTime) {
  const toMinutes = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const ct = toMinutes(checkTime);
  const st = toMinutes(startTime);
  const et = toMinutes(endTime);
  return ct >= st && ct <= et;
}

// 🧑‍🤝‍🧑 একটা attendance লাইন কে attendance object এ parse করে (fast, no I/O)
function parseAttendanceLine(line) {
  const parts = line.trim().split(/\t+/);
  if (parts.length < 4 || isNaN(parts[0])) return null;

  const user_id = parseInt(parts[0]);
  const rawTime = parts[1];
  const dateObj = new Date(rawTime);
  if (isNaN(dateObj.getTime())) return null;

  return {
    user_id,
    dateObj,
    attendance_date: dateObj.toISOString().split("T")[0],
    check_in_time: dateObj.toTimeString().split(" ")[0].slice(0, 5),
    day_name: dateObj.toLocaleDateString("en-US", { weekday: "long" }),
    verify_mode: parseInt(parts[2]),
    status: parseInt(parts[3]),
  };
}

// 🍽️ একজন user এর জন্য meal check + mobile alert flag সেট করা (background এ চলে, device কে block করে না)
async function checkMealAndAlert(entry) {
  const { user_id, attendance_date, check_in_time, day_name } = entry;

  try {
    const mealRes = await mealApi.get(
      `https://alabadanbackendpart.alabadan.com/api/allwise-user-meals/${user_id}`,
    );

    const rawData = mealRes.data?.data;
    const userMeals = rawData ? (Array.isArray(rawData) ? rawData : [rawData]) : [];

    const matchedPackage = userMeals.find((p) => p.uid === user_id);
    const user_name =
      matchedPackage?.name ||
      matchedPackage?.user_name ||
      matchedPackage?.userName ||
      `User ${user_id}`;

    let mealMatched = false;
    let matchedMealId = null;
    let matchedMealType = null;

    outer: for (const mealPackage of userMeals) {
      if (mealPackage.uid !== user_id) continue;
      for (const meal of mealPackage.meals || []) {
        if (meal.day !== day_name) continue;
        if (isTimeBetween(check_in_time, meal.start_time, meal.end_time)) {
          mealMatched = true;
          matchedMealId = meal._id;
          matchedMealType = meal.meal_type;
          break outer;
        }
      }
    }

    // 📱 mobile alert flag আগে সেট — এটার জন্য PATCH শেষ হওয়া পর্যন্ত অপেক্ষা করার দরকার নেই
    mobileAlertPending = true;
    lastMobileAlertUser = user_id;
    lastMobileAlertName = user_name;
    lastMobileAlertType = mealMatched ? "meal_found" : "no_meal";
    addLog(mealMatched ? "MEAL_FOUND" : "NO_MEAL_FOUND", { user_id, user_name });
    addLog("MOBILE_ALERT_SET", { user_id, user_name, type: lastMobileAlertType });

    if (mealMatched) {
      console.log(`✅ Meal found -> mobile alert set for User ${user_id} (${user_name})`);
      // 🔧 PATCH আলাদাভাবে, alert flag সেট হওয়ার পরে — fire and forget (await করা হচ্ছে না)
      mealApi
        .patch(
          `https://alabadanbackendpart.alabadan.com/api/allwise-user-meal-update/${matchedMealId}`,
          { is_attendance: true },
        )
        .then(() => {
          console.log(`📌 Meal Updated -> User ${user_id} | ${matchedMealType}`);
        })
        .catch((err) => {
          console.log("Meal update error:", err.message);
        });
    } else {
      console.log(`🔇 No meal -> mobile alert set for User ${user_id} (${user_name})`);
    }
  } catch (err) {
    console.error(`Meal check failed for user ${user_id}:`, err.message);
    addLog("MEAL_CHECK_ERROR", { user_id, error: err.message });
  }
}

// 🚀 MAIN ATTENDANCE FUNCTION (/cdata)
async function takeAttendanceDataFromDevice(req, res) {
  const content = req.rawBody;

  addLog("CDATA_RECEIVED", {
    method: req.method,
    query: req.query,
    bodyPreview: content ? content.substring(0, 300) : "(empty)",
  });

  if (!content || content.trim() === "") {
    return res.status(200).send("OK");
  }

  const lines = content.trim().split("\n").filter(Boolean);
  const entries = lines.map(parseAttendanceLine).filter(Boolean);

  // ⚡ device কে সাথে সাথেই OK পাঠিয়ে দিচ্ছি — মিল চেক/external API এর জন্য device কে
  // আর অপেক্ষা করতে হবে না, এটাই এখন পর্যন্ত সবচেয়ে বড় delay এর কারণ ছিল
  res.status(200).send("OK");

  // 💾 attendance save (দ্রুত, শুধু নিজের DB তে) — সব লাইন সমান্তরালে
  await Promise.all(
    entries.map(async (entry) => {
      try {
        await Attendance.create({
          user_id: entry.user_id,
          timestamp: entry.dateObj,
          attendance_date: entry.attendance_date,
          check_in_time: entry.check_in_time,
          day_name: entry.day_name,
          status: entry.status,
          verify_mode: entry.verify_mode,
        });
        console.log(`📌 Attendance Saved -> User ${entry.user_id} | ${entry.check_in_time}`);
      } catch (err) {
        console.error("Attendance Error:", err.message);
      }
    }),
  );

  // 🍽️ meal check + mobile alert — এটাও সমান্তরালে (response এর পরে চলছে, device block হচ্ছে না)
  entries.forEach((entry) => {
    checkMealAndAlert(entry).catch((err) =>
      console.error("checkMealAndAlert failed:", err.message),
    );
  });
}

// 📱 MOBILE POLLS THIS — প্রতি ৫০০ মিলিসেকেন্ডে চেক করবে সাউন্ড বাজাতে হবে কিনা
router.get("/mobile-check", (req, res) => {
  if (mobileAlertPending) {
    mobileAlertPending = false; // একবার পড়লেই রিসেট হয়ে যাবে
    const userId = lastMobileAlertUser;
    const userName = lastMobileAlertName;
    const type = lastMobileAlertType;
    addLog("MOBILE_ALERT_DELIVERED", { user_id: userId, user_name: userName, type });
    return res.json({ alert: true, user_id: userId, user_name: userName, type });
  }
  return res.json({ alert: false });
});

// 📱 MOBILE ALERT PAGE — এই পেজটা মোবাইলে খুলে রাখলে, /mobile-check পোল করে সাউন্ড বাজাবে
// URL: GET /iclock/mobile-alert
router.get("/mobile-alert", (req, res) => {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Meal Sound Alert</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
    background: #111;
    color: #eee;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px;
    transition: background 0.3s ease;
  }
  body.alerting-red { background: #7a1f1f; }
  body.alerting-green { background: #1f7a2e; }

  h1 { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
  p.sub { font-size: 14px; color: #999; margin-bottom: 32px; }

  .status-dot {
    width: 16px; height: 16px; border-radius: 50%;
    background: #2e7d32;
    margin: 0 auto 16px;
    box-shadow: 0 0 0 0 rgba(46,125,50,0.6);
    animation: pulse 2s infinite;
  }
  .status-dot.off { background: #555; animation: none; }
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(46,125,50,0.6); }
    70% { box-shadow: 0 0 0 12px rgba(46,125,50,0); }
    100% { box-shadow: 0 0 0 0 rgba(46,125,50,0); }
  }

  #startBtn {
    font-size: 18px;
    padding: 16px 32px;
    border-radius: 12px;
    border: none;
    background: #3d7fff;
    color: white;
    font-weight: 600;
  }

  #lastEvent {
    margin-top: 24px;
    font-size: 13px;
    color: #aaa;
  }

  .badge {
    font-size: 13px;
    color: #666;
    margin-top: 40px;
  }
</style>
</head>
<body id="body">

  <div id="preStart">
    <h1>মিল সাউন্ড অ্যালার্ট</h1>
    <p class="sub">শুরু করতে নিচের বাটনে চাপ দিন<br>(মোবাইলের সাউন্ড unlock করার জন্য একবার চাপ দিতে হয়)</p>
    <button id="startBtn">🔊 চালু করুন</button>
  </div>

  <div id="running" style="display:none">
    <div class="status-dot" id="dot"></div>
    <h1>মনিটরিং চলছে</h1>
    <p class="sub">মেশিনে fingerprint দিলে — meal থাকলে সবুজ, না থাকলে লাল সাউন্ড বাজবে</p>
    <div id="lastEvent">এখনো কোনো অ্যালার্ট আসেনি</div>
  </div>

  <div class="badge">স্ক্রিন অন রেখে, এই পেজ খোলা রাখুন</div>

<script>
  const SERVER_URL = window.location.origin + "/iclock/mobile-check";
  const POLL_INTERVAL_MS = 500; // ⚡ 1000 থেকে কমিয়ে 500 — alert আগে ধরবে

  let audioCtx = null;

  function unlockAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  }

  // type: "meal_found" (green, pleasant double-beep) | "no_meal" (red, harsh beep)
  function playBeep(type) {
    if (!audioCtx) return;

    const body = document.getElementById("body");

    if (type === "meal_found") {
      // ✅ সুন্দর দুটো টোন (উপরে উঠে)
      [660, 880].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.value = 0.5;
        osc.connect(gain).connect(audioCtx.destination);
        const startAt = audioCtx.currentTime + i * 0.18;
        osc.start(startAt);
        osc.stop(startAt + 0.18);
      });

      body.classList.add("alerting-green");
      setTimeout(() => body.classList.remove("alerting-green"), 1200);
    } else {
      // 🔇 কড়া alert সাউন্ড
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.value = 0.5;
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 2);

      body.classList.add("alerting-red");
      setTimeout(() => body.classList.remove("alerting-red"), 2000);
    }
  }

  async function pollServer() {
    try {
      const res = await fetch(SERVER_URL, { cache: "no-store" });
      const data = await res.json();

      if (data.alert) {
        playBeep(data.type);
        const label = data.type === "meal_found" ? "✅ Meal Found" : "🔇 No Meal";
        const displayName = data.user_name || \`User \${data.user_id}\`;
        document.getElementById("lastEvent").textContent =
          \`শেষ অ্যালার্ট: \${displayName} (ID: \${data.user_id}) — \${label} — \${new Date().toLocaleTimeString("bn-BD")}\`;
      }
    } catch (err) {
      document.getElementById("dot").classList.add("off");
      console.error("Poll error:", err);
      return;
    }
    document.getElementById("dot").classList.remove("off");
  }

  document.getElementById("startBtn").addEventListener("click", () => {
    unlockAudio();
    document.getElementById("preStart").style.display = "none";
    document.getElementById("running").style.display = "block";
    setInterval(pollServer, POLL_INTERVAL_MS);
  });
</script>

</body>
</html>`);
});

// 📌 DEVICE POLLS THIS TO GET PENDING COMMANDS
// মেশিনে আর কোনো কমান্ড পাঠানো হয় না, তাই সবসময় "OK" রিটার্ন করবে
// (ZKT ডিভাইস প্রোটোকল অনুযায়ী এই রুটে রেসপন্স দেওয়া লাগে, তাই রুটটা রাখা হলো)
function getRequestHandler(req, res) {
  const sn = req.query.SN || req.query.sn;
  addLog("GETREQUEST_POLL", { sn });
  return res.status(200).send("OK");
}

// 🖥️ ব্রাউজারে দেখার জন্য ডিবাগ ড্যাশবোর্ড
router.get("/debug", (req, res) => {
  const rows = debugLog
    .map((log) => {
      const { time, event, ...rest } = log;
      const details = Object.entries(rest)
        .map(([k, v]) => `<b>${k}:</b> ${typeof v === "object" ? JSON.stringify(v) : v}`)
        .join("<br>");

      const colors = {
        CDATA_RECEIVED: "#e3f2fd",
        NO_MEAL_FOUND: "#ffebee",
        MEAL_FOUND: "#e8f5e9",
        GETREQUEST_POLL: "#fafafa",
        MOBILE_ALERT_SET: "#fff9c4",
        MOBILE_ALERT_DELIVERED: "#e1f5fe",
        MEAL_CHECK_ERROR: "#fce4ec",
      };
      const bg = colors[event] || "#ffffff";

      return `
        <tr style="background:${bg}">
          <td style="padding:6px;white-space:nowrap;font-size:12px;color:#555">${time}</td>
          <td style="padding:6px;font-weight:bold;font-size:13px">${event}</td>
          <td style="padding:6px;font-size:12px">${details}</td>
        </tr>`;
    })
    .join("");

  res.send(`
    <html>
    <head>
      <meta http-equiv="refresh" content="3">
      <title>ZK Device Debug Log</title>
      <style>
        body { font-family: monospace, sans-serif; margin: 20px; background:#f5f5f5; }
        table { border-collapse: collapse; width: 100%; background:white; }
        th { background:#333; color:white; padding:8px; text-align:left; }
        tr { border-bottom: 1px solid #ddd; }
        .info { background:white; padding:10px; margin-bottom:10px; border-radius:6px; }
      </style>
    </head>
    <body>
      <div class="info">
        <b>Auto-refresh:</b> প্রতি ৩ সেকেন্ডে<br>
        <b>Mobile alert page:</b> /iclock/mobile-alert
      </div>
      <table>
        <tr><th>সময়</th><th>ইভেন্ট</th><th>বিস্তারিত</th></tr>
        ${rows || "<tr><td colspan='3' style='padding:20px'>এখনো কোনো লগ নাই</td></tr>"}
      </table>
    </body>
    </html>
  `);
});

// 📌 ROUTES
router.all("/cdata", takeAttendanceDataFromDevice);
router.all("/getrequest", getRequestHandler);

module.exports = router;