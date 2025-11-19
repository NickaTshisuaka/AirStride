// backend/routes/productRoutes.js
import express from "express";
import Product from "../models/product.js"; // adjust path to your Mongoose model or Mongo layer
import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET all products (protected)
router.get("/", requireAuth, async (req, res) => {
  try {
    const products = await Product.find({});
    res.json({ products });
  } catch (err) {
    console.error("GET /products error:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// GET by SKU (must come BEFORE :id)
router.get("/by-sku/:sku", requireAuth, async (req, res) => {
  try {
    const product = await Product.findOne({ product_id: req.params.sku });
    if (!product) return res.status(404).json({ error: "Product not found (SKU)" });
    res.json({ product });
  } catch (err) {
    console.error("GET /products/by-sku error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET by MongoDB _id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found (ID)" });
    res.json({ product });
  } catch (err) {
    console.error("GET /products/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ADMIN: create product
router.post("/", requireAdmin, async (req, res) => {
  try {
    const p = new Product(req.body);
    const saved = await p.save();
    res.status(201).json({ product: saved });
  } catch (err) {
    console.error("POST /products error:", err);
    res.status(400).json({ error: "Failed to create product" });
  }
});

// ADMIN: update
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: "Product not found" });
    res.json({ product: updated });
  } catch (err) {
    console.error("PUT /products/:id error:", err);
    res.status(400).json({ error: "Failed to update product" });
  }
});

// ADMIN: delete
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("DELETE /products/:id error:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
