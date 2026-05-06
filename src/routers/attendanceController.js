import express from "express";
import axios from "axios";
import Attendance from "../../models/Attendance/Attendance.js";

const router = express.Router();

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

// 🚀 MAIN ATTENDANCE FUNCTION
async function takeAttendanceDataFromDevice(req, res) {
  const content = req.rawBody;

  if (!content || content.trim() === "") {
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
    const check_in_time = dateObj
      .toTimeString()
      .split(" ")[0]
      .slice(0, 5);

    const day_name = dateObj.toLocaleDateString("en-US", {
      weekday: "long",
    });

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

      console.log(
        `📌 Attendance Saved -> User ${user_id} | ${check_in_time}`
      );

      // 2️⃣ GET MEAL DATA
      const mealRes = await axios.get(
        `https://meal-management-sand.vercel.app/api/allwise-user-meals/${user_id}`
      );

      const userMeals = mealRes.data?.data || [];

      for (const mealPackage of userMeals) {
        // ✅ UID MATCH FIX
        if (mealPackage.uid !== user_id) continue;

        const meals = mealPackage.meals || [];

        for (const meal of meals) {
          // 🗓 DAY MATCH
          if (meal.day !== day_name) continue;

          // ⏰ TIME MATCH
          const match = isTimeBetween(
            check_in_time,
            meal.start_time,
            meal.end_time
          );

          if (match) {
            try {
              await axios.patch(
                `https://meal-management-sand.vercel.app/api/allwise-user-meal-update/${meal._id}`,
                {
                  is_attendance: true,
                }
              );

              console.log(
                `✅ Updated -> User ${user_id} | ${meal.meal_type}`
              );
            } catch (err) {
              console.log("Meal update error:", err.message);
            }
          }
        }
      }
    } catch (err) {
      console.error("Attendance Error:", err.message);
    }
  }

  return res.status(200).send("OK");
}

// 📌 ROUTES
router.all("/cdata", takeAttendanceDataFromDevice);
router.all("/getrequest", takeAttendanceDataFromDevice);

export default router;