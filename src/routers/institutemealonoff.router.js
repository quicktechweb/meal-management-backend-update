const express = require("express");

const router = express.Router();

const Institutemealonofftime = require("../models/institutemealonoff.model");
const instituteRequireAuth = require("../middlewares/instituteAuth.middleware");

router.post("/meal-on-off-time", instituteRequireAuth, async (req, res) => {
  try {
    const { institute_id, meal_on_off_time } = req.body;

    const data = await Institutemealonofftime.create({
      institute_id,
      meal_on_off_time,
    });

    res.status(201).json({
      success: true,
      message: "Created Successfully",
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
  "/meal-on-off-time/:institute_id",
  instituteRequireAuth,
  async (req, res) => {
    try {
      const data = await Institutemealonofftime.findOne({
        institute_id: req.params.institute_id,
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

router.put(
  "/meal-on-off-time/:institute_id",
  instituteRequireAuth,
  async (req, res) => {
    try {
      const { meal_on_off_time } = req.body;

      const updated = await Institutemealonofftime.findOneAndUpdate(
        { institute_id: req.params.institute_id },
        { meal_on_off_time },
        { new: true, upsert: true },
      );

      res.json({
        success: true,
        message: "Updated Successfully",
        data: updated,
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
