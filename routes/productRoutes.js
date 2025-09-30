// backend/routes/products.js
import express from "express";
import Product from "../models/Product.js"; // your mongoose model

const router = express.Router();

// GET all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

export default router;
