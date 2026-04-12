const express = require("express");

const router = express.Router();

const Service = require("../models/service.model");

router.get("/all-services", async (req, res) => {
  try {
    const data = await Service.find();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/create-service", async (req, res) => {
  try {
    const { title } = req.body;
    const service = await Service.create({ title });

    res.status(201).json({
      success: true,
      message: "Service Created Successfully",
      data: service,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
