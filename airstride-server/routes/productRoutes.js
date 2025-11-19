import express from "express";
import { firebaseAuth } from "../middleware/firebaseAuth.js";
import {
  getAllProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct
} from "../controllers/productController.js";

const router = express.Router();

router.get("/", firebaseAuth, getAllProducts);
router.post("/", firebaseAuth, createProduct);
router.get("/:id", firebaseAuth, getProductById);
router.put("/:id", firebaseAuth, updateProduct);
router.delete("/:id", firebaseAuth, deleteProduct);

export default router;
