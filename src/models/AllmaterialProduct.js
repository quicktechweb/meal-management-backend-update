const mongoose = require("mongoose");

const ingredientSchema = new mongoose.Schema(
  {
    material: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      required: true,
    },
    gramPerServing: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    servingSize: { type: Number, required: true, min: 0 }, // total grams per serving (info only)
    ingredients: [ingredientSchema],
  },
  { timestamps: true }
);

const Product = mongoose.model("AllmaterialProduct", productSchema);
module.exports = Product;