const express = require("express");

const router = express.Router();

const Feature = require("../models/feature.model");

const Service = require("../models/service.model");

router.get("/all-feature", async (req, res) => {
  try {
    const data = await Feature.find().populate("service");
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/create-feature", async (req, res) => {
  try {
    const { service } = req.body;
    const serviceExists = await Service.findById(service);
    if (!serviceExists) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid service ID" });
    }
    const feature = await Feature.create(req.body);
    res.status(201).json({
      success: true,
      message: "Feature Created Successfully",
      data: feature,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/update-feature/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.service) {
      const serviceExists = await Service.findById(updateData.service);
      if (!serviceExists) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid service ID" });
      }
    }

    const updatedFeature = await Feature.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate("service");

    if (!updatedFeature) {
      return res
        .status(404)
        .json({ success: false, message: "Feature not found" });
    }

    res.status(200).json({
      success: true,
      message: "Feature updated successfully",
      data: updatedFeature,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/delete-feature/:id", async (req, res) => {
  try {
    const deleted = await Feature.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Feature not found" });

    res
      .status(200)
      .json({ success: true, message: "Feature deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
