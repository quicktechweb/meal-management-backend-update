const mongoose = require("mongoose");

const EpsTransactionSchema = new mongoose.Schema(
  {
    // 🔹 internal order/invoice reference
    invoiceId: { type: String, required: true },
    userOrderId: { type: String }, // চাইলে তোমার অন্যান্য order collection এর সাথে লিংক করার জন্য

    // 🔹 EPS specific ids
    merchantTransactionId: { type: String, required: true, unique: true },
    epsTransactionId: { type: String, default: null },

    amount: { type: Number, required: true },

    // 🔹 shipping / customer snapshot
    customerName: { type: String },
    customerEmail: { type: String },
    customerPhone: { type: String },
    customerAddress: { type: String },

    cartItems: [
      {
        name: String,
        qty: Number,
        price: Number,
      },
    ],

    // 🔹 EPS response tracking
    redirectUrl: { type: String },
    status: {
      type: String,
      enum: ["initiated", "success", "failed", "cancelled"],
      default: "initiated",
    },

    verificationResponse: { type: mongoose.Schema.Types.Mixed, default: null },

    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EpsTransaction", EpsTransactionSchema);