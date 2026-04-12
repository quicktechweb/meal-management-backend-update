const express = require("express");

const router = express.Router();

const MealInstituteRegistrationType = require("../models/mealInstituteRegistrationType.model");

router.post("/meal-institute-registration-type", async (req, res) => {
  try {
    const { title } = req.body;
    const data = await MealInstituteRegistrationType.create({ title });

    res.status(201).json({
      success: true,
      message: "Meal Institute Registration Type Created Successfully",
      data: data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.get("/meal-institute-registration-type", async (req, res) => {
  try {
    const data = await MealInstituteRegistrationType.find();
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
