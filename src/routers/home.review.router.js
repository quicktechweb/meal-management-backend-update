const express = require("express");
const router = express.Router();

const HomeReview = require("../models/home.review.model");
const uploadToImageBB = require("../utilities/uploadToImageBB");
const upload = require("../utilities/multer");

const IMAGEBB_API_KEY = process.env.imagbbKey;

router.post(
  "/review-create",
  upload.fields([{ name: "image", maxCount: 1 }]),
  async (req, res) => {
    try {
      const data = req.body;
      const files = req.files || {};

      if (!data?.name) {
        return res.status(400).json({
          success: false,
          message: "Name is required",
        });
      }

      if (!data?.review_text) {
        return res.status(400).json({
          success: false,
          message: "Review text is required",
        });
      }

      if (!data?.rating) {
        return res.status(400).json({
          success: false,
          message: "Rating is required",
        });
      }

      const imageFile = files.image ? files.image[0] : null;

      let imageUrl = null;

      if (imageFile) {
        imageUrl = await uploadToImageBB(imageFile.buffer, IMAGEBB_API_KEY);
      }

      const reviewData = await HomeReview.create({
        name: data.name,
        role: data.role || "User",
        review_text: data.review_text,
        rating: Number(data.rating),
        source: data.source || "BizBite",
        image: imageUrl,
      });

      return res.status(201).json({
        success: true,
        message: "Review Created Successfully",
        data: reviewData,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

router.get("/all-review", async (req, res) => {
  try {
    const reviews = await HomeReview.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: reviews,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/single-review/:id", async (req, res) => {
  try {
    const review = await HomeReview.findById(req.params.id);

    res.json({
      success: true,
      data: review,
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

router.put(
  "/review-update/:id",
  upload.fields([{ name: "image", maxCount: 1 }]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const files = req.files || {};

      const existingReview = await HomeReview.findById(id);

      if (!existingReview) {
        return res.status(404).json({
          success: false,
          message: "Review not found",
        });
      }

      const imageFile = files.image ? files.image[0] : null;

      let imageUrl = existingReview.image;

      if (imageFile) {
        imageUrl = await uploadToImageBB(imageFile.buffer, IMAGEBB_API_KEY);
      }

      const updatedReview = await Review.findByIdAndUpdate(
        id,
        {
          name: data.name || existingReview.name,
          role: data.role || existingReview.role,
          review_text: data.review_text || existingReview.review_text,
          rating: data.rating ? Number(data.rating) : existingReview.rating,
          source: data.source || existingReview.source,
          image: imageUrl,
        },
        { new: true },
      );

      return res.status(200).json({
        success: true,
        message: "Review Updated Successfully",
        data: updatedReview,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

router.delete("/review-delete/:id", async (req, res) => {
  try {
    await HomeReview.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
