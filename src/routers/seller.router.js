const express = require("express");

const router = express.Router();

const Seller = require("../models/seller.model");

// GET -
router.get("/seller", async (req, res) => {
  try {
    const items = await Seller.find();

    return res.status(200).json({
      success: true,
      message: "Seller lists fetched successfully",
      data: items,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.post("/seller", async (req, res) => {
  try {
    const data = req.body;

    if (!data) {
      return res
        .status(400)
        .json({ success: false, message: "All fields required" });
    }

    if (!data?.seller_name) {
      return res
        .status(400)
        .json({ success: false, message: "Seller Name field required" });
    }

    const sellerData = await Seller.create({
      seller_name: data.seller_name,
    });

    return res.status(201).json({
      success: true,
      message: "Seller Created Successfully",
      data: sellerData,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

router.patch(
  "/seller/:id",

  async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const existingItem = await Seller.findById(id);
      if (!existingItem) {
        return res
          .status(404)
          .json({ success: false, message: "Item not found" });
      }

      const updateData = { ...data };

      const updatedSeller = await Seller.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });

      return res.status(200).json({
        success: true,
        message: "Item updated successfully",
        data: updatedSeller,
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
router.delete("/seller/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deletedSeller = await Seller.findByIdAndDelete(id);

    if (!deletedSeller) {
      return res
        .status(404)
        .json({ success: false, message: "Seller not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Seller deleted successfully",
      data: deletedSeller,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

module.exports = router;
