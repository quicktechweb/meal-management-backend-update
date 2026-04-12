const express = require("express");

const router = express.Router();

const Feature = require("../models/feature.model");

const Kitchen = require("../models/kitchen.model");

const ServiceType = require("../models/serviceType.modal");

router.get("/all-feature", async (req, res) => {
  try {
    const data = await Feature.find()
      .populate("kitchen")
      .populate("service_type");

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/create-feature", async (req, res) => {
  try {
    const { kitchen, service_type } = req.body;
    const kitchenExists = await Kitchen.findById(kitchen);
    if (!kitchenExists) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid kitchen ID" });
    }

    if (service_type) {
      const serviceTypeExists = await ServiceType.findById(service_type);

      if (!serviceTypeExists) {
        return res.status(400).json({
          success: false,
          message: "Invalid service type id",
        });
      }
    }

    const feature = await Feature.create({
      ...req.body,
    });

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
    const { name, price, kitchen, service_type } = req.body;

    const existingFeature = await Feature.findById(id);
    if (!existingFeature) {
      return res.status(404).json({
        success: false,
        message: "Feature not found",
      });
    }

    // kitchen validation
    if (kitchen) {
      const kitchenExists = await Kitchen.findById(kitchen);
      if (!kitchenExists) {
        return res.status(400).json({
          success: false,
          message: "Invalid kitchen ID",
        });
      }
    }

    if (service_type) {
      const serviceTypeExists = await ServiceType.findById(service_type);

      if (!serviceTypeExists) {
        return res.status(400).json({
          success: false,
          message: "Invalid service type id",
        });
      }
    }

    // required validation
    if (name === "") {
      return res.status(400).json({
        success: false,
        message: "Feature name is required",
      });
    }

    if (price === "" || price === null) {
      return res.status(400).json({
        success: false,
        message: "Feature price is required",
      });
    }

    const updatedFeature = await Feature.findByIdAndUpdate(
      id,
      {
        name: name ?? existingFeature.name,
        price: price ?? existingFeature.price,
        kitchen: kitchen ?? existingFeature.kitchen,
      },
      { new: true },
    ).populate("kitchen");

    res.status(200).json({
      success: true,
      message: "Feature updated successfully",
      data: updatedFeature,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
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
