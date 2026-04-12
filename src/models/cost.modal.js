const mongoose = require("mongoose");

const costSchema = new mongoose.Schema(
  {
    title: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Cost", costSchema);
