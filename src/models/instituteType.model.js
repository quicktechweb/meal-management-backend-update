const mongoose = require("mongoose");

const instituteTypeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.Model("InstituteType", instituteTypeSchema);
