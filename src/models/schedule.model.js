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

// Schedule schema
const scheduleSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"],
      required: true,
      unique: true,
    },
    dayNumber: {
      type: Number,
      required: true,
      unique: true,
      min: 0,
      max: 6,
    },

    meals: {
      type: [mealSchema],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Schedule", scheduleSchema);

