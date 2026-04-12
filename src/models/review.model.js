const mongoose = require("mongoose");

const replySchema = new mongoose.Schema({
  replyText: { type: String, required: true },
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const reviewSchema = new mongoose.Schema(
  {
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    meal_type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meal",
      required: true,
    },
    replies: [replySchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Review", reviewSchema);
