const mongoose = require("mongoose");

const buyerSchema = new mongoose.Schema(
  {
    buyer_name: String,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Buyer", buyerSchema);
