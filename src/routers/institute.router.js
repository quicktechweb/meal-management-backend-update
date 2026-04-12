const express = require("express");

const router = express.Router();
const Institute = require("../models/instititute.model");

router.get("/all-institute", async (req, res) => {
  try {
    const data = await Institute.find();

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
