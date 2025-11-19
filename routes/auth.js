import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || "superSecretKey";

const router = express.Router();

// Signup (no auth)
router.post("/signup", async (req, res) => {
  try {
    const { email, password, role } = req.body; // allow role for admin/user
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, role: role || "user" });
    await user.save();

    res.status(201).json({ message: "User created", user: { email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: "Error during signup", error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });

    res.json({ token, user: { email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: "Error during login", error: err.message });
  }
});

export default router;
