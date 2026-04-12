const Review = require("../models/review.model");
const User = require("../models/user.model");
const { Schedule } = require("../models/schedule.model");

// Create a new review
const createReview = async (req, res) => {
  try {
    const { rating, comment, user, meal_type } = req.body;

    const schedule = await Schedule.find();
    console.log(schedule);

    if (!meal) {
      return res.status(404).json({ message: "Meal not found" });
    }

    const newReview = new Review({
      rating,
      comment,
      user,
      meal_type: meal._id,
    });

    await newReview.save();
    res.status(201).json(newReview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all reviews
const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("user", "name email")
      .populate("meal_type", "mealType items");
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single review by ID
const getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate("user", "name email")
      .populate("meal_type", "name");
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update a review
const updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { rating, comment },
      { new: true },
    );
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a review
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addReply = async (req, res) => {
  try {
    const { replyText, repliedBy, isAdmin } = req.body;

    if (isAdmin) {
      const user = await User.findById(repliedBy);
      if (!user || user.role !== "admin")
        return res.status(403).json({ message: "Only admin can reply" });
    }

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    review.replies.push({ replyText, repliedBy, isAdmin });
    await review.save();

    await review.populate("replies.repliedBy", "name email");

    res.json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteReply = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: "Review not found" });

    review.replies.id(req.params.replyId).remove();
    await review.save();
    res.json({ message: "Reply deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createReview,
  getAllReviews,
  getReviewById,
  updateReview,
  deleteReview,
  deleteReply,
  addReply,
};
