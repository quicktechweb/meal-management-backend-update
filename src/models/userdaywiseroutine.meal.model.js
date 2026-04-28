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
        is_attendance: {
          type: Boolean,
          default: false,
        },
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

module.exports = mongoose.model(
  "UserDayWiseRoutineMeal",
  userDayWiseRoutineMealSchema,
);
