const mongoose = require("mongoose");

const userDayWiseMealSchema = new mongoose.Schema(
  {
    type: String,
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InstituteRegistration",
    },
    institute_id: String,
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

module.exports = mongoose.model("UserDayWiseMeal", userDayWiseMealSchema);
