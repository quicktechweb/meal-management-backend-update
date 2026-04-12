const express = require("express");

const router = express.Router();

const Cost = require("../models/cost.modal");

router.post("/add-cost", async (req, res) => {
  try {
    const { title } = req.body;

    const cost = await Cost.create({ title });

    res.status(201).json({
      status: true,
      message: "Cost Created Successfully",
      data: cost,
    });

    
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
});

router.get("/get-cost", async (req, res) => {
  try {
    const data = await Cost.find();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
  s;
});

module.exports = router;
