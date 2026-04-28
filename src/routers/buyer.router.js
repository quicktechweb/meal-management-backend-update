const express = require("express");

const router = express.Router();

const Buyer = require("../models/buyer.model");

// GET -
router.get("/buyer", async (req, res) => {
  try {
    const items = await Buyer.find();

    return res.status(200).json({
      success: true,
      message: "Buyer lists fetched successfully",
      data: items,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.post("/buyer", async (req, res) => {
  try {
    const data = req.body;

    if (!data) {
      return res
        .status(400)
        .json({ success: false, message: "All fields required" });
    }

    if (!data?.buyer_name) {
      return res
        .status(400)
        .json({ success: false, message: "Buyer Name field required" });
    }

    const BuyerData = await Buyer.create({
      buyer_name: data.buyer_name,
    });

    return res.status(201).json({
      success: true,
      message: "Buyer Created Successfully",
      data: BuyerData,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.patch(
  "/buyer/:id",

  async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const existingItem = await Buyer.findById(id);
      if (!existingItem) {
        return res
          .status(404)
          .json({ success: false, message: "Item not found" });
      }

      const updateData = { ...data };

      const updatedBuyer = await Buyer.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      return res.status(200).json({
        success: true,
        message: "Item updated successfully",
        data: updatedBuyer,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },
);

// DELETE
router.delete("/buyer/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedBuyer = await Buyer.findByIdAndDelete(id);

    if (!deletedBuyer) {
      return res
        .status(404)
        .json({ success: false, message: "Buyer not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Buyer deleted successfully",
      data: deletedBuyer,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
