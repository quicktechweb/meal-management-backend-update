const mongoose = require("mongoose");

const instituteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    institute_image: String,
    institute_address: String,

    kitchen_type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Kitchen",
    },

    utilites_service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UtilityService",
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
    },

    feature: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Feature",
    },

    meals: {},

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Institute", instituteSchema);
