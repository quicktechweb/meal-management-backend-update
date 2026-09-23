const express = require("express");
const axios = require("axios");
const Attendance = require("../../src/models/Attendance");

// (Optional) jodi apnar DB te User model thake, uncomment kore path thik korun:
// const User = require("../../src/models/User");

const router = express.Router();

/* ------------------------------------------------------------------ */
/* 📱 MOBILE ALERT QUEUE                                               */
/* ------------------------------------------------------------------ */
// Ek sathe onek jon fingerprint dileo alert hariye jabe na
const mobileAlertQueue = []; // { user_id, user_name, type }

/* ------------------------------------------------------------------ */
/* 🧑 USER NAME CACHE (machine theke ashe)                             */
/* ------------------------------------------------------------------ */
// pin (string) -> name
const userNameCache = {};

function parseUserInfo(content) {
  // Device format: "USER PIN=5\tName=Rahim\tPri=0\tPasswd=\tCard=..."
  const lines = content.split("\n").filter(Boolean);
  let count = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!/PIN=/i.test(line)) continue;

    const fields = {};
    line.split(/\t+/).forEach((token) => {
      const cleaned = token.replace(/^USER\s+/i, "").replace(/^USERINFO\s+/i, "");
      const idx = cleaned.indexOf("=");
      if (idx > 0) {
        const key = cleaned.slice(0, idx).trim().toLowerCase();
        const val = cleaned.slice(idx + 1).trim();
        fields[key] = val;
      }
    });

    if (fields.pin && fields.name) {
      userNameCache[String(fields.pin)] = fields.name;
      count++;
      addLog("USER_CACHED", { pin: fields.pin, name: fields.name });
    }
  }
  return count;
}

/* ------------------------------------------------------------------ */
/* 📋 DEBUG LOG (max 100 entry)                                        */
/* ------------------------------------------------------------------ */
const debugLog = [];
function addLog(event, data = {}) {
  debugLog.unshift({
    time: new Date().toLocaleString("en-GB", { timeZone: "Asia/Dhaka" }),
    event,
    ...data,
  });
  if (debugLog.length > 100) debugLog.pop();
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ------------------------------------------------------------------ */
/* 🔥 RAW BODY READER (ZKT device support)                             */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/* 🧠 TIME CHECK HELPER                                                */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/* 🧑 NAME RESOLVER                                                    */
/* Priority: 1) machine cache  2) meal API  3) DB (optional)  4) fallback */
/* ------------------------------------------------------------------ */
async function resolveUserName(user_id, matchedPackage, mealData) {
  // 1) machine er name
  if (userNameCache[String(user_id)]) return userNameCache[String(user_id)];

  // 2) meal API
  const fromApi =
    matchedPackage?.name ||
    matchedPackage?.user_name ||
    matchedPackage?.userName ||
    matchedPackage?.fullName ||
    matchedPackage?.user?.name ||
    mealData?.name ||
    mealData?.user?.name;
  if (fromApi) return fromApi;

  // 3) DB (optional) — uncomment korle kaj korbe
  // try {
  //   const userDoc = await User.findOne({ user_id });
  //   if (userDoc?.name) return userDoc.name;
  // } catch (e) {
  //   console.log("User DB lookup error:", e.message);
  // }

  // 4) fallback
  return `User ${user_id}`;
}

/* ------------------------------------------------------------------ */
/* 🚀 MAIN ATTENDANCE FUNCTION (/cdata)                                */
/* ------------------------------------------------------------------ */
async function takeAttendanceDataFromDevice(req, res) {
  const content = req.rawBody;
  const table = String(req.query.table || "").toUpperCase();

  addLog("CDATA_RECEIVED", {
    method: req.method,
    table: table || "(none)",
    query: req.query,
    bodyPreview: content ? content.substring(0, 300) : "(empty)",
  });

  if (!content || content.trim() === "") {
    return res.status(200).send("OK");
  }

  // 👤 USER INFO (machine e user add/edit korle push kore) — name cache e rakho
  if (
    table === "USERINFO" ||
    table === "OPERLOG" ||
    /(^|\t|\s)PIN=/i.test(content)
  ) {
    const n = parseUserInfo(content);
    if (n > 0) console.log(`👤 ${n} user name cached from device`);
    // OPERLOG / USERINFO te attendance nai, tai ekhanei shesh
    if (table !== "" && table !== "ATTLOG") {
      return res.status(200).send("OK");
    }
  }

  // Attendance chhara onno table hole skip
  if (table !== "" && table !== "ATTLOG") {
    return res.status(200).send("OK");
  }

  const lines = content.trim().split("\n").filter(Boolean);

  for (const line of lines) {
    const parts = line.trim().split(/\t+/);
    if (parts.length < 4 || isNaN(parts[0])) continue;

    const user_id = parseInt(parts[0]);
    const rawTime = parts[1];
    const dateObj = new Date(rawTime);
    if (isNaN(dateObj.getTime())) continue;

    const attendance_date = dateObj.toISOString().split("T")[0];
    const check_in_time = dateObj.toTimeString().split(" ")[0].slice(0, 5);
    const day_name = dateObj.toLocaleDateString("en-US", { weekday: "long" });
    const verify_mode = parseInt(parts[2]);
    const status = parseInt(parts[3]);

    try {
      // 1️⃣ SAVE ATTENDANCE
      await Attendance.create({
        user_id,
        timestamp: dateObj,
        attendance_date,
        check_in_time,
        day_name,
        status,
        verify_mode,
      });

      console.log(`📌 Attendance Saved -> User ${user_id} | ${check_in_time}`);

      // 2️⃣ GET MEAL DATA
      let userMeals = [];
      let mealData = null;
      try {
        const mealRes = await axios.get(
          `https://alabadanbackendpart.alabadan.com/api/allwise-user-meals/${user_id}`
        );
        mealData = mealRes.data;

        // 🔍 API response er raw structure dekhar jonno (name kon field e ase)
        addLog("MEAL_API_RAW", {
          user_id,
          raw: JSON.stringify(mealRes.data).substring(0, 500),
        });

        const rawData = mealRes.data?.data;
        userMeals = rawData ? (Array.isArray(rawData) ? rawData : [rawData]) : [];
      } catch (apiErr) {
        console.log("Meal API error:", apiErr.message);
        addLog("MEAL_API_ERROR", { user_id, error: apiErr.message });
      }

      let mealMatched = false;

      // 🧑 USER NAME (uid string/number dutoi handle kora hoyeche)
      const matchedPackage = userMeals.find(
        (p) => String(p.uid) === String(user_id)
      );
      const user_name = await resolveUserName(user_id, matchedPackage, mealData);

      outer: for (const mealPackage of userMeals) {
        if (String(mealPackage.uid) !== String(user_id)) continue;

        for (const meal of mealPackage.meals || []) {
          if (meal.day !== day_name) continue;

          const match = isTimeBetween(check_in_time, meal.start_time, meal.end_time);

          if (match) {
            mealMatched = true;
            try {
              await axios.patch(
                `https://alabadanbackendpart.alabadan.com/api/allwise-user-meal-update/${meal._id}`,
                { is_attendance: true }
              );
              console.log(`✅ Meal Updated -> User ${user_id} | ${meal.meal_type}`);
            } catch (err) {
              console.log("Meal update error:", err.message);
            }
            break outer;
          }
        }
      }

      // 3️⃣ MOBILE ALERT — meal thakle GREEN, na thakle RED
      const type = mealMatched ? "meal_found" : "no_meal";
      addLog(mealMatched ? "MEAL_FOUND" : "NO_MEAL_FOUND", { user_id, user_name });

      mobileAlertQueue.push({ user_id, user_name, type });
      if (mobileAlertQueue.length > 50) mobileAlertQueue.shift();
      addLog("MOBILE_ALERT_SET", { user_id, user_name, type });
    } catch (err) {
      console.error("Attendance Error:", err.message);
    }
  }

  return res.status(200).send("OK");
}

/* ------------------------------------------------------------------ */
/* 📱 MOBILE POLLS THIS (prati 1 second)                               */
/* ------------------------------------------------------------------ */
router.get("/mobile-check", (req, res) => {
  const alert = mobileAlertQueue.shift();
  if (alert) {
    addLog("MOBILE_ALERT_DELIVERED", alert);
    return res.json({ alert: true, ...alert });
  }
  return res.json({ alert: false });
});

/* ------------------------------------------------------------------ */
/* 📱 MOBILE ALERT PAGE                                                */
/* URL: GET /iclock/mobile-alert                                       */
/* (template literal er vitor kono backtick/${} use kora hoyni,        */
/*  tai escape er jhamela nai)                                         */
/* ------------------------------------------------------------------ */
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

  #bigName {
    font-size: 34px;
    font-weight: 700;
    margin-top: 24px;
    word-break: break-word;
    color: #fff;
  }
  #bigInfo {
    font-size: 18px;
    color: #ddd;
    margin-top: 8px;
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

    <div id="bigName"></div>
    <div id="bigInfo"></div>

    <div id="lastEvent">এখনো কোনো অ্যালার্ট আসেনি</div>
  </div>

  <div class="badge">স্ক্রিন অন রেখে, এই পেজ খোলা রাখুন</div>

<script>
  var SERVER_URL = window.location.origin + "/iclock/mobile-check";
  var POLL_INTERVAL_MS = 1000;

  var audioCtx = null;

  function unlockAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  }

  // type: "meal_found" (green, double-beep) | "no_meal" (red, harsh beep)
  function playBeep(type) {
    if (!audioCtx) return;

    var body = document.getElementById("body");

    if (type === "meal_found") {
      [660, 880].forEach(function (freq, i) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.value = 0.5;
        osc.connect(gain).connect(audioCtx.destination);
        var startAt = audioCtx.currentTime + i * 0.18;
        osc.start(startAt);
        osc.stop(startAt + 0.18);
      });

      body.classList.add("alerting-green");
      setTimeout(function () { body.classList.remove("alerting-green"); }, 1200);
    } else {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.value = 0.5;
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 2);

      body.classList.add("alerting-red");
      setTimeout(function () { body.classList.remove("alerting-red"); }, 2000);
    }
  }

  async function pollServer() {
    try {
      var res = await fetch(SERVER_URL, { cache: "no-store" });
      var data = await res.json();

      if (data.alert) {
        playBeep(data.type);

        var displayName = data.user_name || ("User " + data.user_id);
        var isMeal = data.type === "meal_found";

        // 🧑 boro kore name dekhano
        document.getElementById("bigName").textContent = displayName;
        document.getElementById("bigInfo").textContent =
          "ID: " + data.user_id + " — " + (isMeal ? "✅ Meal আছে" : "❌ Meal নেই");

        document.getElementById("lastEvent").textContent =
          "শেষ অ্যালার্ট: " + new Date().toLocaleTimeString("bn-BD");
      }
    } catch (err) {
      document.getElementById("dot").classList.add("off");
      console.error("Poll error:", err);
      return;
    }
    document.getElementById("dot").classList.remove("off");
  }

  document.getElementById("startBtn").addEventListener("click", function () {
    unlockAudio();
    document.getElementById("preStart").style.display = "none";
    document.getElementById("running").style.display = "block";
    setInterval(pollServer, POLL_INTERVAL_MS);
  });
</script>

</body>
</html>`);
});

/* ------------------------------------------------------------------ */
/* 📌 DEVICE POLLS THIS TO GET PENDING COMMANDS                        */
/* ------------------------------------------------------------------ */
function getRequestHandler(req, res) {
  const sn = req.query.SN || req.query.sn;
  addLog("GETREQUEST_POLL", { sn });
  return res.status(200).send("OK");
}

/* ------------------------------------------------------------------ */
/* 👤 Cache e kon kon user er name ache dekhar page                    */
/* URL: GET /iclock/users                                              */
/* ------------------------------------------------------------------ */
router.get("/users", (req, res) => {
  const rows = Object.entries(userNameCache)
    .map(
      ([pin, name]) =>
        `<tr><td style="padding:6px">${esc(pin)}</td><td style="padding:6px">${esc(name)}</td></tr>`
    )
    .join("");
  res.send(`
    <html><head><meta charset="UTF-8"><title>Device Users</title></head>
    <body style="font-family:sans-serif;margin:20px">
      <h3>Machine theke pawa user name (${Object.keys(userNameCache).length} jon)</h3>
      <table border="1" cellspacing="0" style="border-collapse:collapse">
        <tr><th style="padding:6px">ID</th><th style="padding:6px">Name</th></tr>
        ${rows || "<tr><td colspan='2' style='padding:12px'>এখনো কোনো name আসেনি</td></tr>"}
      </table>
    </body></html>
  `);
});

/* ------------------------------------------------------------------ */
/* 🖥️ DEBUG DASHBOARD                                                  */
/* ------------------------------------------------------------------ */
router.get("/debug", (req, res) => {
  const rows = debugLog
    .map((log) => {
      const { time, event, ...rest } = log;
      const details = Object.entries(rest)
        .map(
          ([k, v]) =>
            `<b>${esc(k)}:</b> ${esc(typeof v === "object" ? JSON.stringify(v) : v)}`
        )
        .join("<br>");

      const colors = {
        CDATA_RECEIVED: "#e3f2fd",
        NO_MEAL_FOUND: "#ffebee",
        MEAL_FOUND: "#e8f5e9",
        GETREQUEST_POLL: "#fafafa",
        MOBILE_ALERT_SET: "#fff9c4",
        MOBILE_ALERT_DELIVERED: "#e1f5fe",
        MEAL_API_RAW: "#f3e5f5",
        MEAL_API_ERROR: "#ffcdd2",
        USER_CACHED: "#e0f2f1",
      };
      const bg = colors[event] || "#ffffff";

      return `
        <tr style="background:${bg}">
          <td style="padding:6px;white-space:nowrap;font-size:12px;color:#555">${esc(time)}</td>
          <td style="padding:6px;font-weight:bold;font-size:13px">${esc(event)}</td>
          <td style="padding:6px;font-size:12px">${details}</td>
        </tr>`;
    })
    .join("");

  res.send(`
    <html>
    <head>
      <meta charset="UTF-8">
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
        <b>Mobile alert page:</b> /iclock/mobile-alert<br>
        <b>Device users (name cache):</b> /iclock/users
      </div>
      <table>
        <tr><th>সময়</th><th>ইভেন্ট</th><th>বিস্তারিত</th></tr>
        ${rows || "<tr><td colspan='3' style='padding:20px'>এখনো কোনো লগ নাই</td></tr>"}
      </table>
    </body>
    </html>
  `);
});

/* ------------------------------------------------------------------ */
/* 📌 ROUTES                                                           */
/* ------------------------------------------------------------------ */
router.all("/cdata", takeAttendanceDataFromDevice);
router.all("/getrequest", getRequestHandler);

module.exports = router;