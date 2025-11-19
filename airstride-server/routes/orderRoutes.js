import express from "express";
import { firebaseAuth } from "../middleware/firebaseAuth.js";
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder
} from "../controllers/orderController.js";

const router = express.Router();

router.post("/", firebaseAuth, createOrder);
router.get("/", firebaseAuth, getAllOrders);
router.get("/:id", firebaseAuth, getOrderById);
router.put("/:id", firebaseAuth, updateOrder);
router.delete("/:id", deleteOrder);

export default router;
