const mongoose = require("mongoose");

const inventoryPurchaseProductSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryProduct",
    },
    price: { type: Number },
    quantity: { type: Number },
    unit: { type: String },

    discount: { type: Number },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Buyer",
    },

    total_price: {
      type: Number,
    },
  },

  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  "InventoryPurchaseProduct",
  inventoryPurchaseProductSchema,
);
