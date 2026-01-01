const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["credit_card", "debit_card", "paypal", "stripe", "cash"],
      required: true,
    },
    transactionId: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,
    failureReason: String,
    refundAmount: Number,
    refundedAt: Date,
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ orderId: 1 }, { unique: true });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
