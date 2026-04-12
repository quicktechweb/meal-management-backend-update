const mongoose = require("mongoose");

const kitchenVideoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    kitchen_video: {
      type: String,
      required: true,
    },

    kitchen_thumbnail: {
      type: [String],
      default: [],
    },

    public_id: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("KitchenVideos", kitchenVideoSchema);
