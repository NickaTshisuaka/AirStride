import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  Product_id: {
    type: String,
    required: true
  },
  Product_name: {
    type: String,
    required: true
  },
  Price: {
    type: Number,
    required: true
  },
  Description: {
    type: String,
    default: ""
  },
  Tags: [{
    type: String
  }],
  img: {
    type: String,
    default: ""
  },
  // Alternative image fields (in case you use different naming)
  images: [{
    url: String,
    alt: String,
    isPrimary: Boolean
  }],
  thumbnailUrl: {
    type: String,
    default: ""
  },
  // Additional useful fields
  category: {
    type: String,
    default: ""
  },
  inStock: {
    type: Boolean,
    default: true
  },
  quantity: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

const Product = mongoose.model("Product", productSchema);
export default Product;