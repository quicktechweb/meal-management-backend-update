const mongoose = require("mongoose");

const materialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      enum: ["kg", "g", "liter", "ml", "piece", "dozen", "bag", "packet"],
      default: "kg",
    },
    pricePerUnit: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

materialSchema.virtual("totalBasePrice").get(function () {
  return parseFloat((this.qty * this.pricePerUnit).toFixed(2));
});

const costingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    totalCost: { type: Number, required: true, min: 0 },
    materials: [{ type: mongoose.Schema.Types.ObjectId, ref: "Material" }],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

costingSchema.virtual("costPerMaterial").get(function () {
  if (!this.materials?.length) return 0;
  return parseFloat((this.totalCost / this.materials.length).toFixed(2));
});

const Material = mongoose.model("Material", materialSchema);
const Costing = mongoose.model("Costing", costingSchema);

module.exports = { Material, Costing };