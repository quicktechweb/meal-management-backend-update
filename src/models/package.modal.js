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
        _id:String,
        title: String,
        image: String,
        video: String,
        ingridents: String,
      },
    ],
    alternative_items: [
      [
        {
          _id:String,
          title: String,
          image: String,
          video: String,
          ingridents: String,
        },
      ],
    ],
  },
  { timestamps: true },
);

const Package = mongoose.model("Package", packageSchema);

module.exports = Package;
