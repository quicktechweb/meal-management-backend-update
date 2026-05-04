const mongoose = require("mongoose");

const inventorySummaryAllWiseSchema = new mongoose.Schema(
  {
    date: String,
    day: String,
    meal_type: String,
    items: [
      {
        title: String,
        totalCount: Number,
        totalKg: Number,
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model(
  "InventorySummaryAllWise",
  inventorySummaryAllWiseSchema,
);
