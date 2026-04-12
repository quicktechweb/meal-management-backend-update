const mongoose = require("mongoose");

const utilityServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    price: { type: Number },

    ranges: [
      {
        min: { type: Number, required: true },
        max: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],

    bear_the_cost: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Cost",
        required: true,
      },
    ],

    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },

    kitchen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kitchen",
      required: true,
    },

    service_type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceType",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("UtilityService", utilityServiceSchema);
