import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/database.js";
import "./config/firebase.js"; // Firebase admin init

import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://airstride.co.za",
    "http://airstride0.3.co.za.s3-website-us-east-1.amazonaws.com"
  ]
}));

// Routes
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);

// Start server after DB connects
connectDB().then(() => {
  app.listen(process.env.PORT || 5000, () =>
    console.log(`API running on port ${process.env.PORT}`)
  );
});
