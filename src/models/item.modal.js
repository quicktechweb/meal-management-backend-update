const mongoose = require("mongoose");

// item schema
const itemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true },
    image: {
      type: String,
    },
    video: {
      type: String,
    },
    ingridents: {
      type: String,
    },
    public_id: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

const Item = mongoose.model("Item", itemSchema);

module.exports = Item;
