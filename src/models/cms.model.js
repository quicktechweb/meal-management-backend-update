const mongoose = require("mongoose");

const cmsSchema = new mongoose.Schema(
  {
    banner: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Banner",
      },
    ],
    chooseImage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChooseImage",
    },
    chooseUs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChooseUs",
      },
    ],
    app: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "App",
    },
  },
  {
    timestamps: true,
  },
);

const Cms = mongoose.model("Cms", cmsSchema);

module.exports = Cms;
