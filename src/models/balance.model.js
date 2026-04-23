const mongoose = require("mongoose");

const balanceSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InstituteRegistration",
      required: true,
    },
    added_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InstituteRegistration",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: [1, "Amount must be at least 1"],
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Balance", balanceSchema);
