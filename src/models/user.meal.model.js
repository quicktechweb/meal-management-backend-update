const mongoose = require("mongoose");

const userMealSchema = new mongoose.Schema(
  {
    type: String,
    date: String,
    day: String,
    user_id: String,
    institute_id: String,
    total_amount: Number,
    meal_type: String,
    start_time: String,
    end_time: String,
    is_on: Boolean,
    items: [
      {
        item_name: String,
        price: Number,
        video: String,
        image: String,
      },
    ],
    guess_meal: [
      {
        meal_type: String,
        items: [
          {
            item_name: String,
            price: String,
          },
        ],
        guess_qty: Number,
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("UserMeal", userMealSchema);
