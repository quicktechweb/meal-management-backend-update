const mongoose = require("mongoose");

const sellerSchema = new mongoose.Schema(
  {
    seller_name: String,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Seller", sellerSchema);
