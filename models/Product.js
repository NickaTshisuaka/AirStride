// models/product.js

import mongoose from "mongoose";

// Define the properties that are common across ALL product types
const baseProductFields = {
    product_id: { // Matches the key in your JSON data (e.g., "SPW001")
        type: String,
        required: true,
        unique: true
    },
    name: { // Matches "name"
        type: String,
        required: true
    },
    category: { // Matches "category"
        type: String,
        required: true
    },
    price: { // Matches "price"
        type: Number,
        required: true
    },
    description: { // Matches "description"
        type: String,
        default: ""
    },
    tags: [{ // Matches "tags"
        type: String
    }],
    inventory_count: { // Matches "inventory_count" (used instead of 'quantity' and 'inStock')
        type: Number,
        default: 0
    },
    brand: { // Matches "brand"
        type: String
    },
    // Optional/Flexible fields to cover all specific product data types
    material: { // Used by Sportswear
        type: String
    },
    available_sizes: [{ // Used by Sportswear
        type: String
    }],
    color: { // Used by Sport Footwear
        type: String
    },
    settings: [{ // Used by Sports Breathing Trainers
        type: String
    }],
    weight_lb: { // Used by Sports Workout Equipment
        type: Number
    },
    // A simplified image field since the JSON didn't include a structure for it.
    // If you use an external CDN, this is the URL.
    imageUrl: {
        type: String,
        default: ""
    }
};

const productSchema = new mongoose.Schema(baseProductFields, {
    timestamps: true // Adds createdAt and updatedAt
});

const Product = mongoose.model("Product", productSchema);
export default Product;