import { getDB } from "../config/database.js";
import { ObjectId } from "mongodb";

export const getAllProducts = async (req, res) => {
  try {
    const products = await getDB().collection("products").find().toArray();
    res.json(products);
  } catch {
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

export const createProduct = async (req, res) => {
  try {
    const result = await getDB().collection("products").insertOne({
      ...req.body,
      createdAt: new Date(),
    });

    res.status(201).json({ _id: result.insertedId, ...req.body });
  } catch {
    res.status(500).json({ error: "Failed to create product" });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await getDB()
      .collection("products")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!product) return res.status(404).json({ error: "Not found" });

    res.json(product);
  } catch {
    res.status(500).json({ error: "Error fetching product" });
  }
};

export const updateProduct = async (req, res) => {
  try {
    await getDB()
      .collection("products")
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });

    res.json({ message: "Updated successfully" });
  } catch {
    res.status(500).json({ error: "Failed to update product" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    await getDB()
      .collection("products")
      .deleteOne({ _id: new ObjectId(req.params.id) });

    res.json({ message: "Product deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete product" });
  }
};
