const express = require("express");

const router = express.Router();

const Kitchen = require("../models/kitchen.model");

router.get("/all-kitchen", async (req, res) => {
  try {
    const data = await Kitchen.find();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/create-kitchen", async (req, res) => {
  try {
    const { title } = req.body;

    const kitchen = await Kitchen.create({ title });

    res.status(201).json({
      success: true,
      message: "Kitchen Created Successfully",
      data: kitchen,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
