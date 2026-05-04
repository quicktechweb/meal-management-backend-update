// const express = require("express");

// const router = express.Router();

// const InventorySummaryAllWise = require("../models/inventorySummaryAllWise.model");
// const InventoryStock = require("../models/inventory.stock.model");
// const InventoryProduct = require("../models/inventoryProduct.model");

// // ── Helper: items দিয়ে stock adjust করে ──────────────────────────
// // sign =  1 → stock বাড়াবে (reverse)
// // sign = -1 → stock কমাবে (stock out)
// const adjustStock = async (items, sign) => {
//   for (const item of items) {
//     // title দিয়ে product খোঁজো (field name প্রয়োজনে পরিবর্তন করো)
//     const product = await InventoryProduct.findOne({ title: item.title });

//     if (!product) continue; // product না পেলে skip

//     const stock = await InventoryStock.findOne({ product: product._id });

//     if (!stock) continue; // stock না পেলে skip

//     const qty = item.totalKg * sign;

//     stock.current_quantity = (stock.current_quantity || 0) + qty;

//     if (sign === -1) {
//       // stock out
//       stock.total_stock_out = (stock.total_stock_out || 0) + item.totalKg;
//     } else {
//       // reverse → আগের stock out কমাও
//       stock.total_stock_out = Math.max(
//         0,
//         (stock.total_stock_out || 0) - item.totalKg,
//       );
//     }

//     await stock.save();
//   }
// };
// // ─────────────────────────────────────────────────────────────────

// router.post("/create-inventory-summary-allwise", async (req, res) => {
//   try {
//     const { date, day, meal_type, items } = req.body;

//     if (!date || !day || !meal_type || !items?.length) {
//       return res.status(400).json({
//         success: false,
//         message: "date, day, meal_type and items are required",
//       });
//     }

//     const existing = await InventorySummaryAllWise.findOne({ date, day });

//     // ── Already exists → Update ───────────────────────────────────
//     if (existing) {
//       // ১. আগের items-এর stock ফেরত দাও
//       await adjustStock(existing.items, 1);

//       // ২. নতুন items-এর stock কাটো
//       await adjustStock(items, -1);

//       const updated = await InventorySummaryAllWise.findByIdAndUpdate(
//         existing._id,
//         { meal_type, items },
//         { new: true },
//       );

//       return res.status(200).json({
//         success: true,
//         message: "Inventory summary updated successfully",
//         data: updated,
//       });
//     }
//     // ─────────────────────────────────────────────────────────────

//     // ── Not exists → Create ───────────────────────────────────────
//     const summary = await InventorySummaryAllWise.create({
//       date,
//       day,
//       meal_type,
//       items,
//     });

//     // নতুন items-এর stock কাটো
//     await adjustStock(items, -1);

//     return res.status(201).json({
//       success: true,
//       message: "Inventory summary created successfully",
//       data: summary,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message,
//     });
//   }
// });

// module.exports = router;
const express = require("express");

const router = express.Router();

const InventorySummaryAllWise = require("../models/inventorySummaryAllWise.model");
const InventoryStock = require("../models/inventory.stock.model");
const InventoryProduct = require("../models/inventoryProduct.model");

// ── Helper: items দিয়ে stock adjust করে ──────────────────────────
// sign =  1 → stock বাড়াবে (reverse)
// sign = -1 → stock কমাবে (stock out)
const adjustStock = async (items, sign) => {
  for (const item of items) {
    // title দিয়ে product খোঁজো (field name প্রয়োজনে পরিবর্তন করো)
    const product = await InventoryProduct.findOne({ title: item.title });

    if (!product) continue; // product না পেলে skip

    const stock = await InventoryStock.findOne({ product: product._id });

    if (!stock) continue; // stock না পেলে skip

    const qty = item.totalKg * sign;

    stock.current_quantity = (stock.current_quantity || 0) + qty;

    if (sign === -1) {
      // stock out
      stock.total_stock_out = (stock.total_stock_out || 0) + item.totalKg;
      stock.total_stock_in = Math.max(
        0,
        (stock.total_stock_in || 0) - item.totalKg,
      );
    } else {
      // reverse → আগের stock out কমাও, stock in ফেরত দাও
      stock.total_stock_out = Math.max(
        0,
        (stock.total_stock_out || 0) - item.totalKg,
      );
      stock.total_stock_in = (stock.total_stock_in || 0) + item.totalKg;
    }

    await stock.save();
  }
};
// ─────────────────────────────────────────────────────────────────

router.post("/create-inventory-summary-allwise", async (req, res) => {
  try {
    const { date, day, meal_type, items } = req.body;

    if (!date || !day || !meal_type || !items?.length) {
      return res.status(400).json({
        success: false,
        message: "date, day, meal_type and items are required",
      });
    }

    const existing = await InventorySummaryAllWise.findOne({ date, day });

    // ── Already exists → Update ───────────────────────────────────
    if (existing) {
      // ১. আগের items-এর stock ফেরত দাও
      await adjustStock(existing.items, 1);

      // ২. নতুন items-এর stock কাটো
      await adjustStock(items, -1);

      const updated = await InventorySummaryAllWise.findByIdAndUpdate(
        existing._id,
        { meal_type, items },
        { new: true },
      );

      return res.status(200).json({
        success: true,
        message: "Inventory summary updated successfully",
        data: updated,
      });
    }
    // ─────────────────────────────────────────────────────────────

    // ── Not exists → Create ───────────────────────────────────────
    const summary = await InventorySummaryAllWise.create({
      date,
      day,
      meal_type,
      items,
    });

    // নতুন items-এর stock কাটো
    await adjustStock(items, -1);

    return res.status(201).json({
      success: true,
      message: "Inventory summary created successfully",
      data: summary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

module.exports = router;
