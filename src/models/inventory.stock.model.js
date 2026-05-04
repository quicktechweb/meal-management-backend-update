const mongoose = require("mongoose");

const inventoryStockSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryProduct",
      required: true,
      unique: true,
    },
    current_quantity: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
    },
    min_stock_level: {
      type: Number,
      default: null,
    },
    total_stock_in: { type: Number, default: 0 },
    total_stock_out: { type: Number, default: 0 },
    last_purchase_price: {
      type: Number,
      default: 0,
    },
    average_purchase_price: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("InventoryStock", inventoryStockSchema);
