import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/database.js";
import "./config/firebase.js"; 

import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();
const app = express();

// Middleware
import cors from "cors";

app.use(cors({
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options("*", cors());



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
