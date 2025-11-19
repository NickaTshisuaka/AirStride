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
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:5173",
        "https://airstride.co.za",
        "http://www.airstride.co.za",
        "http://airstride0.3.co.za.s3-website-us-east-1.amazonaws.com",
        "http://www.airstride0.3.co.za.s3-website-us-east-1.amazonaws.com",
        "null", // for some static site requests
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // if you need cookies/auth headers
  })
);


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
