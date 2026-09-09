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

    // 🔹 এই balance entry কোথা থেকে এসেছে
    source: {
      type: String,
      enum: ["manual", "eps"],
      default: "manual",
    },

    // 🔹 payment status ট্র্যাক করার জন্য — manual entry সবসময় "success"
    status: {
      type: String,
      enum: ["initiated", "success", "failed", "cancelled"],
      default: "success",
    },

    // 🔹 EPS payment হলে এই ফিল্ডগুলো ব্যবহার হবে
    invoiceId: { type: String, default: null },
    merchantTransactionId: {
      type: String,
      default: null,
      unique: true,
      sparse: true, // manual entries এ null থাকবে, unique constraint এ সমস্যা হবে না
    },
    epsTransactionId: { type: String, default: null },
    redirectUrl: { type: String, default: null },
    verificationResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    errorMessage: { type: String, default: null },

    // 🔹 payment এর সময় customer snapshot (EPS এর জন্য দরকার)
    customerName: { type: String },
    customerEmail: { type: String },
    customerPhone: { type: String },
    customerAddress: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Balance", balanceSchema);