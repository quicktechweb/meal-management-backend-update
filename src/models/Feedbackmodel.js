const mongoose = require("mongoose");

const mealFeedbackSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InstituteRegistration",
      required: true,
    },
    institute_id: {
      type: String,
      required: true,
      index: true,
    },
    meal_type: {
      type: String,
      required: true,
    },
    meal_date: {
      type: String,
      required: true,
    },
    rating_overall:  { type: Number, min: 1, max: 5, required: true },
    rating_taste:    { type: Number, min: 1, max: 5, default: undefined },
    rating_quantity: { type: Number, min: 1, max: 5, default: undefined },
    rating_hygiene:  { type: Number, min: 1, max: 5, default: undefined },
    mood: {
      type: String,
      enum: ["😍", "😊", "😐", "😞", "🤢"],
    },
    comment: {
      type: String,
      maxlength: 500,
    },
    admin_reply: { type: String, default: null },
    replied_at:  { type: Date,   default: null },
  },
  { timestamps: true }
);

mealFeedbackSchema.index(
  { user_id: 1, meal_type: 1, meal_date: 1 },
  { unique: true }
);

module.exports = mongoose.model("MealFeedback", mealFeedbackSchema);