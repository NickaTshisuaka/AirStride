import { getDB } from "../config/database.js";
import { ObjectId } from "mongodb";

export const createOrder = async (req, res) => {
  try {
    const { items, status } = req.body;

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: "Order must contain items" });

    let total = 0;

    for (const item of items) {
      if (!item.productId || typeof item.quantity !== "number")
        return res.status(400).json({ error: "Invalid item structure" });

      total += (item.price || 0) * item.quantity;
    }

    const order = {
      userId: req.user.uid || null,
      items,
      total,
      status: status || "pending",
      createdAt: new Date(),
    };

    const result = await getDB().collection("orders").insertOne(order);
    order._id = result.insertedId;

    res.status(201).json(order);
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: "Server error creating order" });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const list = await getDB().collection("orders").find().toArray();
    res.json(list);
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ error: "Server error fetching orders" });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await getDB()
      .collection("orders")
      .findOne({ _id: new ObjectId(req.params.id) });

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json(order);
  } catch (err) {
    console.error("Get order error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const update = {};
    if (req.body.status) update.status = req.body.status;
    if (req.body.items) update.items = req.body.items;

    await getDB()
      .collection("orders")
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: update });

    res.json({ message: "Order updated" });
  } catch (err) {
    console.error("Update order error:", err);
    res.status(500).json({ error: "Server error updating order" });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    await getDB()
      .collection("orders")
      .deleteOne({ _id: new ObjectId(req.params.id) });

    res.json({ message: "Order deleted" });
  } catch (err) {
    console.error("Delete order error:", err);
    res.status(500).json({ error: "Server error deleting order" });
  }
};
