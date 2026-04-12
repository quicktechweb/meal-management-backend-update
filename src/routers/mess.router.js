const express = require("express");

const router = express.Router();

const Mess = require("../models/mess.model");

router.get("/all-mess", async (req, res) => {
  try {
    const data = await Mess.find();
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
