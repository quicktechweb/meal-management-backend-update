const express = require("express");

const router = express.Router();

const Hall = require("../models/hall.model");

router.get("/all-hall", async (req, res) => {
  try {
    const data = await Hall.find();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
