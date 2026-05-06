import mongoose from "mongoose";
 
const attendanceSchema = new mongoose.Schema({
    user_id:   { type: Number, required: true },
    timestamp: { type: Date,   required: true },

    attendance_date: { type: String }, // YYYY-MM-DD
    check_in_time:   { type: String }, // HH:mm:ss

    // 🔥 NEW: day field
    day_name: { type: String },

    status:    { type: Number, required: true },
    verify_mode: { type: Number },

}, { timestamps: true });
 
const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;