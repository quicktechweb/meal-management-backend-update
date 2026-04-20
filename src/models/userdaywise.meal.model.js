const mongoose = require("mongoose");

const userDayWiseMealSchema = new mongoose.Schema(
  {
    type: String,
    user_id: String,
    institute_id: String,
    routine_type: String,
    meals: [
      {
        day: String,
        meal_type: String,
        package_price: Number,
        is_on: Boolean,
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
