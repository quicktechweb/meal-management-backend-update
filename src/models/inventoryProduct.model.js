const mongoose = require("mongoose");

const inventoryProductSchema = new mongoose.Schema(
  {
    title: String,
    image: String,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("InventoryProduct", inventoryProductSchema);
