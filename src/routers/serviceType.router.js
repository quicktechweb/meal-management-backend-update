const express = require("express");
const router = express.Router();

const ServiceType = require("../models/serviceType.modal");

// CREATE SERVICE TYPE
router.post("/service-type", async (req, res) => {
  try {
    const { title } = req.body;

    const data = await ServiceType.create({ title });

    res.status(201).json({
      success: true,
      message: "Service type created successfully",
      data: data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// GET ALL SERVICE TYPES
router.get("/service-type", async (req, res) => {
  try {
    const data = await ServiceType.find();

    res.status(200).json({
      success: true,
      message: "Data fetch successfully",
      data: data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
