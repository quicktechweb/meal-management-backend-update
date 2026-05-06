import Attendance from "../../models/Attendance.js";
import moment from "moment";

export const takeAttendanceDataFromDevice = async (req, res) => {
  try {
    const content = req.body?.toString() || "";

    // 🔹 Heartbeat
    if (!content || content.trim() === "") {
      console.log("Heartbeat OK");
      return res.status(200).send("OK");
    }

    const lines = content.trim().split("\n");

    for (const line of lines) {
      const parts = line.trim().split(/\t+/);

      if (parts.length >= 7 && !isNaN(parts[0])) {
        const user_id = parseInt(parts[0]);
        const timestamp = parts[1];
        const verify_mode = parseInt(parts[2]);
        const status = parseInt(parts[3]);

        const time = moment(timestamp);

        const attendance_date = time.format("YYYY-MM-DD");
        const check_in_time = time.format("HH:mm:ss");

        // 🔹 Duplicate check
        const exists = await Attendance.exists({
          user_id,
          timestamp: time.toDate(),
        });
        if (exists) continue;

        // 🔹 First punch check
        const alreadyToday = await Attendance.exists({
          user_id,
          attendance_date,
        });
        const is_first_punch = !alreadyToday;

        // 🔹 Save
        await Attendance.create({
          user_id,
          timestamp: time.toDate(),
          attendance_date,
          check_in_time,
          verify_mode,
          status,
          is_first_punch,
          late: 0,
        });

        console.log("Saved:", user_id, check_in_time);
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("ERROR");
  }
};