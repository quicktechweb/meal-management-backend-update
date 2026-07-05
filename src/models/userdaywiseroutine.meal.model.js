const mongoose = require("mongoose");

const userDayWiseRoutineMealSchema = new mongoose.Schema(
  {
    type: String,
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InstituteRegistration",
    },
    institute_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InstituteRegistration",
    },
    routine_type: String,
    uid: Number,
    meals: [
      {
        day: String,
        meal_type: String,
        package_price: Number,
        start_time: String,
        end_time: String,
        is_on: Boolean,
        total_price: Number,
        balance_deducted: {
          type: Boolean,
          default: false,
        },
         last_deducted_date: {          // ⬅️ নতুন
          type: String,                // "2026-07-05" ফরম্যাটে
          default: null,
        },
        is_attendance: {
          type: Boolean,
          default: false,
        },
         deduction_history: [          // ⬅️ নতুন — যোগ করুন
          {
            date: { type: String, required: true },
            amount: { type: Number, required: true },
          },
        ],
        selected_items: [
          {
            title: String,
          },
        ],
        guest_items: [{ title: String }],
        is_alternative: Boolean,
        guest_quantity: Number,
      },
    ],
  },
  {
    timestamps: true,
  },
);

userDayWiseRoutineMealSchema.index({
  "meals.day": 1,
  "meals.is_on": 1,
  "meals.balance_deducted": 1,
});
module.exports = mongoose.model(
  "UserDayWiseRoutineMeal",
  userDayWiseRoutineMealSchema,
);
