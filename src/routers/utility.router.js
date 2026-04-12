const express = require("express");

const router = express.Router();

const UtilityService = require("../models/utility.service.model");
const Kitchen = require("../models/kitchen.model");

const ServiceType = require("../models/serviceType.modal");

const Cost = require("../models/cost.modal");

router.get("/all-utilities", async (req, res) => {
  try {
    const data = await UtilityService.find()
      .populate("kitchen")
      .populate("bear_the_cost");

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/create-utilities", async (req, res) => {
  try {
    const { kitchen, price, ranges, bear_the_cost, service_type } = req.body;

    // kitchen check
    const kitchenExists = await Kitchen.findById(kitchen);

    if (!kitchenExists) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid kitchen ID" });
    }

    // service type check

    const serviceTypeExists = await ServiceType.findById(service_type);

    if (!serviceTypeExists) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid service type ID" });
    }

    // bear_the_cost check
    if (!bear_the_cost || bear_the_cost.length === 0) {
      return res.status(400).json({
        success: false,
        message: "bear_the_cost is required",
      });
    }

    const costExists = await Cost.find({
      _id: { $in: bear_the_cost },
    });

    if (costExists.length !== bear_the_cost.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid bear_the_cost ID",
      });
    }

    // price validation
    if (ranges.length === 0 && (price === null || price === "")) {
      return res.status(400).json({
        success: false,
        message:
          "If you have not added price ranges, the service price is required.",
      });
    }

    // range validation
    if (ranges && ranges.length > 0) {
      for (const r of ranges) {
        const min = Number(r.min);
        const max = Number(r.max);
        const price = Number(r.price);
        if (min == null || max == null || price == null) {
          return res.status(400).json({
            success: false,
            message: "Each range must have min, max and price",
          });
        }

        if (min > max) {
          return res.status(400).json({
            success: false,
            message: "Range min cannot be greater than max",
          });
        }
      }
    }

    const utilities = await UtilityService.create({
      ...req.body,
      bear_the_cost,
      ranges: ranges || [],
    });

    res.status(201).json({
      success: true,
      message: "Utilities Created Successfully",
      data: utilities,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put("/update-utilities/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { kitchen, price, ranges, bear_the_cost, service_type } = req.body;

    const existingUtility = await UtilityService.findById(id);
    if (!existingUtility) {
      return res.status(404).json({
        success: false,
        message: "Utility Service not found",
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

    // bear_the_cost validation
    if (bear_the_cost && bear_the_cost.length > 0) {
      const costExists = await Cost.find({
        _id: { $in: bear_the_cost },
      });

      if (costExists.length !== bear_the_cost.length) {
        return res.status(400).json({
          success: false,
          message: "Invalid bear_the_cost ID",
        });
      }
    }

    // price validation
    const finalRanges = ranges ?? existingUtility.ranges;
    const finalPrice = price ?? existingUtility.price;

    if (
      (!finalRanges || finalRanges.length === 0) &&
      (finalPrice === null || finalPrice === "")
    ) {
      return res.status(400).json({
        success: false,
        message:
          "If you have not added price ranges, the service price is required.",
      });
    }

    // range validation

    if (finalRanges && finalRanges.length > 0) {
      for (const r of finalRanges) {
        const min = Number(r.min);
        const max = Number(r.max);
        const price = Number(r.price);
        if (min == null || max == null || price == null) {
          return res.status(400).json({
            success: false,
            message: "Each range must have min, max and price",
          });
        }

        if (min > max) {
          return res.status(400).json({
            success: false,
            message: "Range min cannot be greater than max",
          });
        }
      }
    }
    const updatedUtility = await UtilityService.findByIdAndUpdate(
      id,
      {
        ...req.body,
        ranges: ranges ?? existingUtility.ranges,
        bear_the_cost: bear_the_cost ?? existingUtility.bear_the_cost,
      },
      { new: true },
    );

    res.status(200).json({
      success: true,
      message: "Utilities Updated Successfully",
      data: updatedUtility,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.delete("/delete-utilities/:id", async (req, res) => {
  try {
    const deleted = await UtilityService.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Utility Service not found" });

    res
      .status(200)
      .json({ success: true, message: "Utility Service deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
