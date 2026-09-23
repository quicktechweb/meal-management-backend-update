const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const Attendance = require("../../src/models/Attendance");

const router = express.Router();

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
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ------------------------------------------------------------------ */
/* 🧑 USER NAMES — shudhu machine theke ashe, kono static/default nai  */
/* (restart e harabe na, tai machine theke pawa name file e cache hoy) */
/* ------------------------------------------------------------------ */
const CACHE_FILE = path.join(__dirname, "iclock-machine-users.json");
let userNames = {}; // pin(string) -> name (machine theke)

try {
  if (fs.existsSync(CACHE_FILE)) {
    userNames = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  }
} catch (e) {
  console.log("cache read error:", e.message);
}

function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(userNames, null, 2), "utf8");
  } catch (e) {
    console.log("cache write error:", e.message);
  }
}

// Machine er data theke user parse: "PIN=8 Name=Tamal" / "pin=8 name=Tamal"
function parseUserInfo(content) {
  let changed = 0;
  const lines = String(content).split(/\r?\n/).filter(Boolean);

  for (const rawLine of lines) {
    if (!/pin\s*=/i.test(rawLine)) continue;

    const fields = {};
    rawLine
      .trim()
      .split(/\t+/)
      .forEach((token) => {
        const cleaned = token.replace(/^(USER|USERINFO)\s+/i, "");
        const idx = cleaned.indexOf("=");
        if (idx > 0) {
          fields[cleaned.slice(0, idx).trim().toLowerCase()] = cleaned
            .slice(idx + 1)
            .trim();
        }
      });

    const name = fields.name || fields.username;
    if (fields.pin && name) {
      if (userNames[String(fields.pin)] !== name) {
        userNames[String(fields.pin)] = name;
        changed++;
        addLog("USER_FROM_MACHINE", { pin: fields.pin, name });
      }
    }
  }
  if (changed > 0) saveCache();
  return changed;
}

function getName(user_id) {
  return userNames[String(user_id)] || null;
}

/* ------------------------------------------------------------------ */
/* 📤 DEVICE COMMAND QUEUE — machine ke user list pathate bola         */
/* ------------------------------------------------------------------ */
const pendingCommands = [];
let cmdCounter = 200;
let autoSyncQueued = false;
let lastSyncQueuedAt = 0;

function queueUserSync(reason) {
  // 30 second er moddhe bar bar queue korbo na
  if (Date.now() - lastSyncQueuedAt < 30000) return;
  lastSyncQueuedAt = Date.now();

  pendingCommands.push(
    `C:${++cmdCounter}:DATA QUERY tablename=user,fielddesc=*,filter=*`
  );
  pendingCommands.push(`C:${++cmdCounter}:DATA QUERY USERINFO`);
  addLog("SYNC_QUEUED", { reason });
}

/* ------------------------------------------------------------------ */
/* 📱 MOBILE ALERT QUEUE                                               */
/* ------------------------------------------------------------------ */
const mobileAlertQueue = []; // { user_id, type, createdAt }

/* ------------------------------------------------------------------ */
/* 🔥 RAW BODY READER (ZKT device support)                             */
/* ------------------------------------------------------------------ */
const KNOWN_PATHS = [
  "/cdata",
  "/getrequest",
  "/mobile-check",
  "/mobile-alert",
  "/debug",
  "/users",
  "/sync-users",
  "/devicecmd",
  "/querydata",
  "/import-users",
];

router.use((req, res, next) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });
  req.on("end", () => {
    req.rawBody = body;

    // Onno kono path e machine request pathale dekhar jonno log
    if (!KNOWN_PATHS.includes(req.path)) {
      addLog("OTHER_REQUEST", {
        method: req.method,
        url: req.originalUrl,
        bodyPreview: body ? body.substring(0, 300) : "(empty)",
      });
    }
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

  // Machine jodi user info pathay, name save kore rakho
  if (table === "USERINFO" || table === "OPERLOG" || /pin\s*=/i.test(content)) {
    parseUserInfo(content);
    if (table !== "" && table !== "ATTLOG") {
      return res.status(200).send("OK");
    }
  }

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

      // Name jana na thakle machine ke user list pathate bolo
      if (!getName(user_id)) {
        queueUserSync(`unknown name for user ${user_id}`);
      }

      // 2️⃣ GET MEAL DATA
      let userMeals = [];
      try {
        const mealRes = await axios.get(
          `https://alabadanbackendpart.alabadan.com/api/allwise-user-meals/${user_id}`
        );
        const rawData = mealRes.data?.data;
        userMeals = rawData ? (Array.isArray(rawData) ? rawData : [rawData]) : [];
      } catch (apiErr) {
        console.log("Meal API error:", apiErr.message);
        addLog("MEAL_API_ERROR", { user_id, error: apiErr.message });
      }

      let mealMatched = false;

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

      // 3️⃣ MOBILE ALERT (name delivery-r somoy resolve hobe)
      const type = mealMatched ? "meal_found" : "no_meal";
      addLog(mealMatched ? "MEAL_FOUND" : "NO_MEAL_FOUND", {
        user_id,
        name: getName(user_id) || "(machine theke ekhono pawa jayni)",
      });

      mobileAlertQueue.push({ user_id, type, createdAt: Date.now() });
      if (mobileAlertQueue.length > 50) mobileAlertQueue.shift();
      addLog("MOBILE_ALERT_SET", { user_id, type });
    } catch (err) {
      console.error("Attendance Error:", err.message);
    }
  }

  return res.status(200).send("OK");
}

/* ------------------------------------------------------------------ */
/* 📱 MOBILE POLLS THIS (prati 1 second)                               */
/* ------------------------------------------------------------------ */
const NAME_WAIT_MS = 6000;

router.get("/mobile-check", (req, res) => {
  const first = mobileAlertQueue[0];
  if (!first) return res.json({ alert: false });

  const name = getName(first.user_id);

  // Machine theke ekhono kono name-i ashe nai hole wait korbo na.
  // Kintu sync kaj kore (onno user er name ache) ar ei user er name ekhono ashe nai —
  // tahole 6 second porjonto name ashar jonno opekkha korbo.
  const syncWorks = Object.keys(userNames).length > 0;
  if (!name && syncWorks && Date.now() - first.createdAt < NAME_WAIT_MS) {
    return res.json({ alert: false });
  }

  mobileAlertQueue.shift();
  const payload = {
    alert: true,
    user_id: first.user_id,
    user_name: name, // null hole page e shudhu ID dekhabe
    type: first.type,
  };
  addLog("MOBILE_ALERT_DELIVERED", payload);
  return res.json(payload);
});

/* ------------------------------------------------------------------ */
/* 📱 MOBILE ALERT PAGE  (GET /iclock/mobile-alert)                    */
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
    font-size: 36px;
    font-weight: 700;
    margin-top: 24px;
    word-break: break-word;
    color: #fff;
  }
  #bigInfo { font-size: 18px; color: #ddd; margin-top: 8px; }
  #lastEvent { margin-top: 24px; font-size: 13px; color: #aaa; }
  .badge { font-size: 13px; color: #666; margin-top: 40px; }
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

        var isMeal = data.type === "meal_found";

        // Machine theke name pele name, na hole shudhu ID
        document.getElementById("bigName").textContent =
          data.user_name ? data.user_name : "ID: " + data.user_id;
        document.getElementById("bigInfo").textContent =
          (data.user_name ? "ID: " + data.user_id + " — " : "") +
          (isMeal ? "✅ Meal আছে" : "❌ Meal নেই");
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

  // Server shuru howar por prothom poll e ekbar user sync chaibo
  if (!autoSyncQueued) {
    autoSyncQueued = true;
    queueUserSync("first device poll");
  }

  const cmd = pendingCommands.shift();
  if (cmd) {
    addLog("COMMAND_SENT", { sn, cmd });
    return res.status(200).send(cmd);
  }

  addLog("GETREQUEST_POLL", { sn });
  return res.status(200).send("OK");
}

// Machine command er result ekhane pathay
function deviceCmdHandler(req, res) {
  const content = req.rawBody || "";
  addLog("DEVICECMD_RECEIVED", {
    url: req.originalUrl,
    bodyPreview: content ? content.substring(0, 400) : "(empty)",
  });
  parseUserInfo(content);
  return res.status(200).send("OK");
}

/* ------------------------------------------------------------------ */
/* 👤 Machine theke pawa user list (shudhu dekhar jonno)               */
/* ------------------------------------------------------------------ */
router.get("/sync-users", (req, res) => {
  lastSyncQueuedAt = 0; // manual sync e throttle bad
  queueUserSync("manual");
  res.redirect("/iclock/users");
});

router.get("/users", (req, res) => {
  const rows = Object.entries(userNames)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(
      ([pin, name]) =>
        `<tr><td style="padding:8px">${esc(pin)}</td><td style="padding:8px">${esc(name)}</td></tr>`
    )
    .join("");

  res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="refresh" content="5">
<title>Machine Users</title></head>
<body style="font-family:sans-serif;margin:20px;max-width:640px">
  <h3>Machine theke pawa user (${Object.keys(userNames).length} jon)</h3>
  <table border="1" cellspacing="0" style="border-collapse:collapse;width:100%;margin:12px 0">
    <tr><th style="padding:8px">ID</th><th style="padding:8px">Name</th></tr>
    ${rows || "<tr><td colspan='2' style='padding:12px'>machine theke ekhono kono name ashe nai</td></tr>"}
  </table>
  <p><a href="/iclock/sync-users">🔄 Machine ke user list pathate bolun</a>
   &nbsp;|&nbsp; <a href="/iclock/debug">Debug log</a></p>
</body></html>`);
});

/* ------------------------------------------------------------------ */
/* 🖥️ DEBUG DASHBOARD                                                  */
/* ------------------------------------------------------------------ */
router.get("/debug", (req, res) => {
  const colors = {
    CDATA_RECEIVED: "#e3f2fd",
    NO_MEAL_FOUND: "#ffebee",
    MEAL_FOUND: "#e8f5e9",
    GETREQUEST_POLL: "#fafafa",
    MOBILE_ALERT_SET: "#fff9c4",
    MOBILE_ALERT_DELIVERED: "#e1f5fe",
    MEAL_API_ERROR: "#ffcdd2",
    USER_FROM_MACHINE: "#e0f2f1",
    SYNC_QUEUED: "#fff3e0",
    COMMAND_SENT: "#fff3e0",
    DEVICECMD_RECEIVED: "#ede7f6",
    OTHER_REQUEST: "#fce4ec",
    USERS_IMPORTED: "#e0f2f1",
  };

  const rows = debugLog
    .map((log) => {
      const { time, event, ...rest } = log;
      const details = Object.entries(rest)
        .map(
          ([k, v]) =>
            `<b>${esc(k)}:</b> ${esc(typeof v === "object" ? JSON.stringify(v) : v)}`
        )
        .join("<br>");
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
        <b>Machine users:</b> /iclock/users
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
/* 📥 LOCAL SYNC SCRIPT ekhane machine er user name pathay              */
/* POST /iclock/import-users  body: {"key":"...","users":[{pin,name}]} */
/* ------------------------------------------------------------------ */
const IMPORT_KEY = process.env.ICLOCK_IMPORT_KEY || "change-me-123";

router.post("/import-users", (req, res) => {
  try {
    const data = JSON.parse(req.rawBody || "{}");
    if (data.key !== IMPORT_KEY) {
      return res.status(401).json({ ok: false, error: "wrong key" });
    }
    let n = 0;
    (data.users || []).forEach((u) => {
      if (u && u.pin && u.name) {
        userNames[String(u.pin)] = String(u.name);
        n++;
      }
    });
    saveCache();
    addLog("USERS_IMPORTED", { count: n });
    return res.json({ ok: true, count: n });
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }
});

/* ------------------------------------------------------------------ */
/* 📌 ROUTES                                                           */
/* ------------------------------------------------------------------ */
router.all("/cdata", takeAttendanceDataFromDevice);
router.all("/getrequest", getRequestHandler);
router.all("/devicecmd", deviceCmdHandler);
router.all("/querydata", deviceCmdHandler);

module.exports = router;