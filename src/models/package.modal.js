const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: true,
    },
    package_title: {
      type: String,
      required: true,
    },
    package_price: {
      type: Number,
      required: true,
    },
    items: [
      {
        title: String,
      },
    ],
    alternative_items: [
      {
        title: String,
      },
    ],
  },
  { timestamps: true },
);

const Package = mongoose.model("Package", packageSchema);

module.exports = Package;
