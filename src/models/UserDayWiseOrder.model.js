const mongoose = require("mongoose");

const userDayWiseOrderSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InstituteRegistration",
    },
    institute_id: String,
    type: String,
    routine_type: String,
    uid: Number,

    day: String,
    meal_type: String,
    package_price: Number,
    start_time: String,
    end_time: String,
    is_on: Boolean,
    balance_deducted: { type: Boolean, default: false },
    is_attendance: { type: Boolean, default: false },
    selected_items: [{ title: String }],
    guest_items: [{ title: String }],
    is_alternative: Boolean,
    guest_quantity: Number,

    // Order tracking
    order_status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("UserDayWiseOrder", userDayWiseOrderSchema);
