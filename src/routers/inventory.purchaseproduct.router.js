const express = require("express");
const mongoose = require("mongoose");
const InventoryPurchaseProduct = require("../models/inventory.purchaseproduct.model");
const InventoryStock = require("../models/inventory.stock.model");

const router = express.Router();

// POST - Create → stock
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

    let stock = await InventoryStock.findOne({ product });
    if (!stock) {
      stock = new InventoryStock({
        product,
        current_quantity: 0,
        unit,
      });
    }

    const old_total = stock.average_purchase_price * stock.current_quantity;
    const new_quantity_total = stock.current_quantity + Number(quantity);
    const new_average =
      new_quantity_total > 0
        ? (old_total + price * quantity) / new_quantity_total
        : 0;

    stock.current_quantity = new_quantity_total;
    stock.total_stock_in = (stock.total_stock_in || 0) + Number(quantity);
    stock.unit = unit || stock.unit;
    stock.last_purchase_price = price;
    stock.average_purchase_price = parseFloat(new_average.toFixed(2));
    await stock.save();

    const isLowStock =
      stock.min_stock_level !== null &&
      stock.current_quantity <= stock.min_stock_level;

    res.status(201).json({
      success: true,
      message: "Purchase product created successfully",
      data: saved,
      stock: {
        current_quantity: stock.current_quantity,
        unit: stock.unit,
      },
      warning: isLowStock
        ? `⚠️ Stock সর্বনিম্ন সীমায় পৌঁছেছে! বর্তমান stock: ${stock.current_quantity}`
        : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Read all
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

// PATCH - Update → quantity
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

    const old_quantity = existing.quantity;
    const new_quantity = req.body.quantity ?? old_quantity;
    const quantity_diff = Number(new_quantity) - Number(old_quantity);

    const price = req.body.price ?? existing.price;
    const discount = req.body.discount ?? existing.discount;
    req.body.total_price = price * new_quantity - (discount || 0);

    const updated = await InventoryPurchaseProduct.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true, runValidators: true },
    );

    let isLowStock = false;
    let currentStock = null;

    if (quantity_diff !== 0) {
      const stock = await InventoryStock.findOne({ product: existing.product });

      if (stock) {
        const new_stock = stock.current_quantity + quantity_diff;

        if (new_stock < 0) {
          return res.status(400).json({
            success: false,
            message: `Stock অপর্যাপ্ত। বর্তমান stock: ${stock.current_quantity}`,
          });
        }

        stock.current_quantity = new_stock;
        await stock.save();

        currentStock = new_stock;
        isLowStock =
          stock.min_stock_level !== null && new_stock <= stock.min_stock_level;
      }
    }

    res.status(200).json({
      success: true,
      message: "Purchase product updated successfully",
      data: updated,
      stock_change:
        quantity_diff !== 0
          ? { quantity_diff, current_quantity: currentStock }
          : "Stock unchanged",
      warning: isLowStock
        ? `⚠️ Stock সর্বনিম্ন সীমায় পৌঁছেছে! বর্তমান stock: ${currentStock}`
        : null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE - Delete → stock
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

    const stock = await InventoryStock.findOne({ product: deleted.product });

    if (stock) {
      stock.current_quantity = Math.max(
        0,
        stock.current_quantity - Number(deleted.quantity),
      );
      await stock.save();
    }

    res.status(200).json({
      success: true,
      message: "Purchase product deleted successfully",
      data: deleted,
      stock: stock
        ? { current_quantity: stock.current_quantity }
        : "Stock record not found",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH - Min stock level set করার জন্য
router.patch("/inventory-stock/set-min-level", async (req, res) => {
  try {
    const { product, min_stock_level } = req.body;

    if (!product || min_stock_level === undefined) {
      return res.status(400).json({
        success: false,
        message: "product এবং min_stock_level আবশ্যক",
      });
    }

    if (min_stock_level <= 0) {
      return res.status(400).json({
        success: false,
        message: "min_stock_level অবশ্যই 0 এর বেশি হতে হবে",
      });
    }

    const stock = await InventoryStock.findOneAndUpdate(
      { product },
      { min_stock_level },
      { new: true },
    );

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: "Stock পাওয়া যায়নি",
      });
    }

    res.status(200).json({
      success: true,
      message: "Minimum stock level set হয়েছে",
      data: {
        product: stock.product,
        current_quantity: stock.current_quantity,
        min_stock_level: stock.min_stock_level,
        unit: stock.unit,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
