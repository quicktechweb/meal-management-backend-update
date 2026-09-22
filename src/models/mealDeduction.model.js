// models/mealDeduction.model.js
// 🧾 প্রতিটা meal এর টাকা কাটার ledger — cron টাকা কাটলেই এখানে একটা entry তৈরি হয়।
// Institute panel, Super admin panel আর User এর balance history — তিনটাই এই collection থেকে data নেয়।
const mongoose = require("mongoose");

const mealDeductionSchema = new mongoose.Schema(
  {
    // কার থেকে টাকা কাটা হলো
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InstituteRegistration",
      required: true,
    },
    // কোন institute এ টাকা ঢুকলো
    institute_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InstituteRegistration",
      required: true,
    },

    // ── Snapshot (পরে user এর নাম/ফোন বদলালেও history ঠিক থাকবে) ──
    user_name: { type: String, default: "" },
    user_uid: { type: Number, default: null },
    user_email: { type: String, default: "" },
    user_phone: { type: String, default: "" },
    user_room: { type: String, default: "" },
    institute_name: { type: String, default: "" },

    // ── কোন meal, কোন দিন ──
    meal_type: { type: String, required: true }, // Breakfast / Lunch / Dinner ...
    meal_date: { type: String, required: true }, // "YYYY-MM-DD" (BD date)
    day: { type: String, default: "" }, // Sunday, Monday ...
    meal_time: { type: String, default: "" }, // "01:00 PM" (meal শুরুর সময়)
    items: { type: [String], default: [] }, // meal এ কী কী item ছিল
    guest_quantity: { type: Number, default: 0 },

    // কোন cron/type থেকে কাটা হলো
    source: {
      type: String,
      enum: ["day_wise", "all_wise", "routine_day_wise", "routine_all_wise"],
      required: true,
    },

    // ── টাকার হিসাব ──
    amount: { type: Number, required: true, min: 0 },
    user_balance_before: { type: Number, default: 0 },
    user_balance_after: { type: Number, default: 0 },
    institute_balance_after: { type: Number, default: 0 },
  },
  { timestamps: true },
);

mealDeductionSchema.index({ institute_id: 1, meal_date: -1, createdAt: -1 });
mealDeductionSchema.index({ user: 1, meal_date: -1, createdAt: -1 });
mealDeductionSchema.index({ meal_date: -1, meal_type: 1 });

module.exports = mongoose.model("MealDeduction", mealDeductionSchema);
