const express = require("express");

const router = express.Router();

const Institutemealonofftime = require("../models/institutemealonoff.model");
const instituteRequireAuth = require("../middlewares/instituteAuth.middleware");

router.post("/meal-on-off-time", instituteRequireAuth, async (req, res) => {
  try {
    const { meal_on_off_time } = req.body;
    const institute_id = req.user._id;

    if (!meal_on_off_time) {
      return res.status(400).json({
        success: false,
        message: "meal_on_off_time is required",
      });
    }

    const data = await Institutemealonofftime.findOneAndUpdate(
      { institute_id },
      { $set: { meal_on_off_time } },
      { upsert: true, new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Saved Successfully",
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
router.get("/meal-on-off-time", instituteRequireAuth, async (req, res) => {
  const user = req.user;

  try {
    const data = await Institutemealonofftime.findOne({
      institute_id: user.institute_id,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get(
  "/institute-meal-on-off-time",
  instituteRequireAuth,
  async (req, res) => {
    const user = req.user;

    try {
      const data = await Institutemealonofftime.findOne({
        institute_id: user._id,
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

module.exports = router;
