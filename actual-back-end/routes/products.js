const express = require("express");
const Product = require("../models/Product");
const auth = require("../middleware/auth");

const router = express.Router();

// Create product
router.post("/", auth, async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: "Product creation failed", error: err });
  }
});

// Get all products
router.get("/", auth, async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// Get single product
router.get("/:id", auth, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

// Update product
router.put("/:id", auth, async (req, res) => {
  const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: "Product not found" });
  res.json(updated);
});

// Delete product
router.delete("/:id", auth, async (req, res) => {
  const deleted = await Product.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Product not found" });
  res.json({ message: "Deleted" });
});

module.exports = router;
