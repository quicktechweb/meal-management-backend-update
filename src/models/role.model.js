const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    institute_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InstituteRegistration",
      required: true,
    },
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission",
      },
    ],
  },
  { timestamps: true },
);

roleSchema.index({ name: 1, institute_id: 1 }, { unique: true });

module.exports = mongoose.model("Role", roleSchema);
