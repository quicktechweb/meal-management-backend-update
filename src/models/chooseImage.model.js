const mongoose = require("mongoose");

const chooseImageSchema = new mongoose.Schema(
  {
    banner_image: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("ChooseImage", chooseImageSchema);
