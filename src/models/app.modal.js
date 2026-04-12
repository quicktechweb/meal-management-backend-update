const mongoose = require("mongoose");

const appSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      require: true,
    },
    description: {
      type: String,
      require: true,
    },
    bg_app: {
      type: String,
      require: true,
    },
    img_app: {
      type: String,
      require: true,
    },
    play_store_url: {
      type: String,
    },
    apple_store_url: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("App", appSchema);
