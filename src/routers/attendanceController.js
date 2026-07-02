import express from "express";
import axios from "axios";
import Attendance from "../../models/Attendance/Attendance.js";

const router = express.Router();

const messageQueue = {};
const debugLog = [];
const userNameMap = {}; // user_id -> name (synced from device USER/OPERLOG records)

// SMS CONFIG
const ACODE = "30000451";
const API_KEY = "f700baf5c74e0d52476ccf98000329ff1a8cf88b";
const SENDER_ID = "8809648901546";

// 🔥 RAW BODY READER
router.use((req, res, next) => {
  let body = "";
  req.on("data", (chunk) => { body += chunk.toString(); });
  req.on("end", () => { req.rawBody = body; next(); });
});

// 🧠 TIME CHECK HELPER
function isTimeBetween(checkTime, startTime, endTime) {
  const toMinutes = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  return toMinutes(checkTime) >= toMinutes(startTime) &&
         toMinutes(checkTime) <= toMinutes(endTime);
}

// 📲 SMS HELPER
async function sendSMS(phone, message) {
  try {
    const contactNumber = `+88${phone}`;
    const url = `https://api.rtcom.xyz/onetomany?acode=${ACODE}&api_key=${API_KEY}&senderid=${SENDER_ID}&type=text&msg=${encodeURIComponent(message)}&contacts=${contactNumber}&transactionType=T&contentID=`;
    const response = await axios.get(url);
    debugLog.push({
      time: new Date().toISOString(),
      event: "sms_sent",
      phone,
      status: response.data?.response?.code,
    });
  } catch (e) {
    debugLog.push({
      time: new Date().toISOString(),
      event: "sms_error",
      error: e.message,
    });
  }
}

// 🔍 TEST ENDPOINT
router.get("/test-queue", (req, res) => {
  res.json({ queue: messageQueue, users: userNameMap, recentLogs: debugLog.slice(-50) });
});

// 📥 CMD RESULT
router.all("/devicecmd", (req, res) => {
  debugLog.push({
    time: new Date().toISOString(),
    event: "CMD_RESULT",
    query: req.query,
    body: req.rawBody?.substring(0, 500),
  });
  return res.status(200).send("OK");
});

// ✅ /getrequest
router.all("/getrequest", (req, res) => {
  const sn = req.query.SN || req.query.sn;

  debugLog.push({
    time: new Date().toISOString(),
    event: "getrequest_received",
    sn,
    queueLength: Object.keys(messageQueue).length,
  });

  const keys = Object.keys(messageQueue);
  if (keys.length > 0) {
    const key = keys[0];
    const { type, userId } = messageQueue[key];
    delete messageQueue[key];

    debugLog.push({
      time: new Date().toISOString(),
      event: "MEAL_FOUND — no command sent",
      userId,
    });
    return res.status(200).send("OK");
  }

  return res.status(200).send("OK");
});

// ✅ /cdata
router.all("/cdata", async (req, res) => {
  const method = req.method;
  const options = req.query.options;
  const sn = req.query.SN || req.query.sn;

  debugLog.push({
    time: new Date().toISOString(),
    event: "cdata_received",
    method,
    query: req.query,
    body: req.rawBody?.substring(0, 300),
  });

  // ── GET options=all → Initialization ──────────────────
  if (method === "GET" && options === "all") {
    debugLog.push({ time: new Date().toISOString(), event: "initialization_request", sn });
    return res.status(200).send(
      `GET OPTION FROM: ${sn}\r\n` +
      `ATTLOGStamp=9999\r\n` +
      `OPERLOGStamp=9999\r\n` +
      `ATTPHOTOStamp=9999\r\n` +
      `ErrorDelay=30\r\n` +
      `Delay=1\r\n` +
      `TransTimes=00:00;14:05\r\n` +
      `TransInterval=1\r\n` +
      `TransFlag=111111111111\r\n` +
      `Realtime=1\r\n` +
      `Encrypt=None\r\n` +
      `\r\n`
    );
  }

  // ── POST → Attendance data ─────────────────────────────
  const content = req.rawBody;
  if (!content || content.trim() === "") return res.status(200).send("OK");

  const lines = content.trim().split("\n").filter(Boolean);

  for (const line of lines) {
    const trimmedLine = line.trim();

    // ── USER INFO LINE (device pushes Name via USER/OPERLOG record) ──
    // Example: USER PIN=8\tName=Karim Ahmed\tPri=0\tPasswd=\tCard=0\tGrp=1\tTZ=...\tVerify=0\tViceCard=
    if (trimmedLine.startsWith("USER ")) {
      const userParts = trimmedLine.split(/\t+/);
      const pinMatch = userParts[0].match(/PIN=(\d+)/);
      const namePart = userParts.find((p) => p.startsWith("Name="));

      if (pinMatch && namePart) {
        const pin = pinMatch[1];
        const name = namePart.replace("Name=", "").trim();
        if (name) {
          userNameMap[pin] = name;
          debugLog.push({ time: new Date().toISOString(), event: "user_name_synced", pin, name });
        }
      }
      continue;
    }

    const parts = trimmedLine.split(/\t+/);
    if (parts.length < 4 || isNaN(parts[0])) continue;

    const user_id         = parseInt(parts[0]);
    const rawTime         = parts[1];
    const dateObj         = new Date(rawTime);
    if (isNaN(dateObj.getTime())) continue;

    const attendance_date = dateObj.toISOString().split("T")[0];
    const check_in_time   = dateObj.toTimeString().split(" ")[0].slice(0, 5);
    const day_name        = dateObj.toLocaleDateString("en-US", { weekday: "long" });
    const verify_mode     = parseInt(parts[2]);
    const status          = parseInt(parts[3]);

    // ── NAME FROM ATTENDANCE LINE ITSELF ─────────────────
    // কোনো কোনো device attendance লাইনের পরের কোনো column এ
    // user এর নাম পাঠায়। 4 নম্বর index এর পরে যদি কোনো
    // non-numeric (text) field থাকে, সেটাকে নাম ধরে নিচ্ছি।
    for (let i = 4; i < parts.length; i++) {
      const field = parts[i]?.trim();
      if (field && isNaN(field)) {
        userNameMap[user_id] = field;
        debugLog.push({ time: new Date().toISOString(), event: "user_name_from_attlog", user_id, name: field });
        break;
      }
    }

    try {
      // ── DUPLICATE CHECK ──────────────────────────────
      const existing = await Attendance.findOne({ user_id, attendance_date, check_in_time });
      if (existing) {
        debugLog.push({ time: new Date().toISOString(), event: "duplicate_skipped", user_id });
        continue;
      }

      // ── SAVE ATTENDANCE ──────────────────────────────
      const attendanceRecord = await Attendance.create({
        user_id, timestamp: dateObj, attendance_date,
        check_in_time, day_name, status, verify_mode, meal_status: "pending",
      });
      debugLog.push({ time: new Date().toISOString(), event: "attendance_saved", user_id, check_in_time });

      // ── FETCH MEAL DATA ──────────────────────────────
      let userMeals = [];
      let userPhone = null;
      let userName = null;

      try {
        const mealRes = await axios.get(
          `https://meal-management-backend-update-3.onrender.com/api/allwise-user-meals/${user_id}`
        );
        const rawData = mealRes.data?.data;
        userMeals = rawData ? (Array.isArray(rawData) ? rawData : [rawData]) : [];
        // phone number meal response এ থাকলে নাও
        userPhone = mealRes.data?.phone || mealRes.data?.data?.phone || null;
        // user এর নাম meal response এ থাকলে নাও
        userName =
          mealRes.data?.name ||
          mealRes.data?.data?.name ||
          mealRes.data?.user_name ||
          mealRes.data?.data?.user_name ||
          mealRes.data?.fullName ||
          mealRes.data?.data?.fullName ||
          null;
        debugLog.push({ time: new Date().toISOString(), event: "meal_fetched", user_id, count: userMeals.length, userPhone, userName });
      } catch (e) {
        debugLog.push({ time: new Date().toISOString(), event: "meal_fetch_error", error: e.message });
      }

      // ── MEAL MATCH CHECK ─────────────────────────────
      let mealMatched = false;

      outer: for (const mealPackage of userMeals) {
        if (mealPackage.uid !== user_id) continue;
        // phone meal package এ থাকলে নাও
        if (!userPhone) userPhone = mealPackage.phone || null;
        // নাম meal package এ থাকলে নাও
        if (!userName) userName = mealPackage.name || mealPackage.user_name || mealPackage.fullName || null;
        for (const meal of (mealPackage.meals || [])) {
          if (meal.day !== day_name) continue;
          const match = isTimeBetween(check_in_time, meal.start_time, meal.end_time);
          debugLog.push({
            time: new Date().toISOString(), event: "meal_time_check",
            user_id, day_name, check_in_time,
            window: `${meal.start_time}–${meal.end_time}`, match,
          });
          if (match) {
            mealMatched = true;
            try {
              await axios.patch(
                `https://meal-management-backend-update-3.onrender.com/api/allwise-user-meal-update/${meal._id}`,
                { is_attendance: true }
              );
              debugLog.push({ time: new Date().toISOString(), event: "meal_updated", user_id });
            } catch (e) {
              debugLog.push({ time: new Date().toISOString(), event: "meal_update_error", error: e.message });
            }
            break outer;
          }
        }
      }

      // ── QUEUE RESULT + SMS ────────────────────────────
      if (!mealMatched) {
        await Attendance.findByIdAndUpdate(attendanceRecord._id, { meal_status: "no_meal" });
        messageQueue[user_id] = { type: "no_meal", userId: user_id };
        debugLog.push({ time: new Date().toISOString(), event: "NO_MEAL_queued", user_id });

        // SMS পাঠাও static number এ
        const displayName = userNameMap[user_id] || userName || "N/A";
        const msg = `নাম: ${displayName}, User ID: ${user_id} এর আজকের (${attendance_date}) কোনো Meal registered নেই।`;
        await sendSMS("01746445559", msg);

      } else {
        await Attendance.findByIdAndUpdate(attendanceRecord._id, { meal_status: "meal_found" });
        messageQueue[user_id] = { type: "meal_found", userId: user_id };
        debugLog.push({ time: new Date().toISOString(), event: "MEAL_FOUND_queued", user_id });
      }

      return res.status(200).send("OK");

    } catch (err) {
      debugLog.push({ time: new Date().toISOString(), event: "error", message: err.message });
      return res.status(200).send("OK");
    }
  }

  return res.status(200).send("OK");
});

export default router;
