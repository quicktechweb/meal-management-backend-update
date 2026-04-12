const mongoose = require("mongoose");

// item schema
const itemSchema = new mongoose.Schema({
  meal_id: { type: Number, required: true },
  title: { type: String, required: true },
  price: { type: Number, required: true },
});

// meal schema
const mealSchema = new mongoose.Schema({
  mealType: { type: String, required: true },
  items: { type: [itemSchema], default: [] },
});

const Meal = mongoose.model("Meal", mealSchema);

module.exports = Meal;
