const express = require("express");
const router = express.Router();
const {
  createReview,
  getAllReviews,
  getReviewById,
  updateReview,
  deleteReview,
  deleteReply,
  addReply,
} = require("../controllers/review.controller");

router.post("/create-review", createReview);
router.get("/all-review", getAllReviews);
router.get("/single-review/:id", getReviewById);
router.put("/update-review/:id", updateReview);
router.delete("/delete-review/:id", deleteReview);
router.post("/review/:id/reply", addReply);
router.delete("/review/:reviewId/reply/:replyId", deleteReply);
module.exports = router;
