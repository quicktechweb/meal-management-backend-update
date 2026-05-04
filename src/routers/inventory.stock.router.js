const express = require("express");

const router = express.Router();

const InventoryStock = require("../models/inventory.stock.model");

router.get("/get-inventory-stock", async (req, res) => {
  try {
    const data = await InventoryStock.find().populate("product", "title image");

    res.status(200).json({
      success: true,
      data: data,
      message: "Inventory stock fetch successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
