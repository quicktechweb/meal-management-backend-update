const express = require("express");
const router = express.Router();
const MealFeedback = require("../models/Feedbackmodel");

router.post("/", async (req, res) => {
  try {
    const {
      user_id, institute_id, meal_type, meal_date,
      rating_overall, rating_taste, rating_quantity, rating_hygiene,
      mood, comment,
    } = req.body;

    if (!user_id || !institute_id || !meal_type || !meal_date || !rating_overall) {
      return res.status(400).json({ success: false, message: "Required fields missing" });
    }

    const feedback = await MealFeedback.create({
      user_id, institute_id, meal_type, meal_date,
      rating_overall,
      // 0 হলে save করবে না, শুধু 1–5 হলে save করবে
      rating_taste:    rating_taste    || undefined,
      rating_quantity: rating_quantity || undefined,
      rating_hygiene:  rating_hygiene  || undefined,
      mood, comment,
    });

    res.status(201).json({ success: true, feedback });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "You already submitted feedback for this meal" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/my/:userId", async (req, res) => {
  try {
    const feedbacks = await MealFeedback.find({ user_id: req.params.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, feedbacks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/admin/:instituteId", async (req, res) => {
  try {
    const { meal_type, meal_date, page = 1, limit = 20 } = req.query;
    const query = { institute_id: req.params.instituteId };
    if (meal_type) query.meal_type = meal_type;
    if (meal_date) query.meal_date = meal_date;

    const skip = (page - 1) * limit;
    const [feedbacks, total] = await Promise.all([
      MealFeedback.find(query)
        .populate("user_id", "information.full_name uid email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      MealFeedback.countDocuments(query),
    ]);

    const avgResult = await MealFeedback.aggregate([
      { $match: { institute_id: req.params.instituteId } },
      { $group: { _id: null, avg: { $avg: "$rating_overall" } } },
    ]);
    const avg_rating = avgResult[0]?.avg?.toFixed(1) ?? "0.0";

    res.json({ success: true, feedbacks, total, avg_rating, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch("/:id/reply", async (req, res) => {
  try {
    const { admin_reply } = req.body;
    const feedback = await MealFeedback.findByIdAndUpdate(
      req.params.id,
      { admin_reply, replied_at: new Date() },
      { new: true }
    );
    if (!feedback) return res.status(404).json({ success: false, message: "Feedback not found" });
    res.json({ success: true, feedback });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;