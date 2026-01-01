const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: "text",
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    images: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

productSchema.index({ name: 1, category: 1 });
productSchema.index({ price: 1 });

module.exports = mongoose.model("Product", productSchema);
