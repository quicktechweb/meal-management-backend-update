const express = require("express");
const mongoose = require("mongoose");
const InventoryPurchaseProduct = require("../models/inventory.purchaseproduct.model");

const router = express.Router();

// POST - Create
router.post("/inventory-purchase-product", async (req, res) => {
  try {
    const { product, price, quantity, unit, discount, seller, buyer } =
      req.body;

    const total_price = price * quantity - (discount || 0);

    const newItem = new InventoryPurchaseProduct({
      product,
      price,
      quantity,
      unit,
      discount,
      seller,
      buyer,
      total_price,
    });

    const saved = await newItem.save();

    res.status(201).json({
      success: true,
      message: "Purchase product created successfully",
      data: saved,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Read all (with optional filters)
router.get("/inventory-purchase-product", async (req, res) => {
  try {
    const { seller, buyer, product } = req.query;

    const filter = {};
    if (seller) filter.seller = seller;
    if (buyer) filter.buyer = buyer;
    if (product) filter.product = product;

    const items = await InventoryPurchaseProduct.find(filter)
      .populate("product", "title")
      .populate("seller", "seller_name")
      .populate("buyer", "buyer_name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH - Update by ID
router.patch("/inventory-purchase-product/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const existing = await InventoryPurchaseProduct.findById(id);
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    // total_price recalculate if price/quantity/discount changed
    const price = req.body.price ?? existing.price;
    const quantity = req.body.quantity ?? existing.quantity;
    const discount = req.body.discount ?? existing.discount;

    req.body.total_price = price * quantity - (discount || 0);

    const updated = await InventoryPurchaseProduct.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      message: "Purchase product updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE - Delete by ID
router.delete("/inventory-purchase-product/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const deleted = await InventoryPurchaseProduct.findByIdAndDelete(id);

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    }

    res.status(200).json({
      success: true,
      message: "Purchase product deleted successfully",
      data: deleted,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
