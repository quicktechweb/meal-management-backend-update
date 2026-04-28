const mongoose = require("mongoose");

const inventoryGlobalAmountSchema = new mongoose.Schema(
  {
    global_amount: Number,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  "InventoryGlobalAmount",
  inventoryGlobalAmountSchema,
);
