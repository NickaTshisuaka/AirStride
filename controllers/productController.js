// server.js
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { fileURLToPath } from "url";
import OpenAI from "openai";


// Models
import User from "./models/User.js";
import Product from "./models/Product.js";

// Config
dotenv.config({ quiet: true });
const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || "superSecretKey";

// __dirname fix for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());

// Custom CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://98.89.166.198:5173", // production frontend
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Serve uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ========== DB CONNECTION ==========
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// ========== HELPERS ==========

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: "1h",
  });
};

// Auth middleware
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) return res.status(401).json({ message: "User not found" });
      next();
    } catch (err) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

// ========== IMAGE UPLOAD & PROCESSING ==========

const UPLOAD_ROOT = path.join(__dirname, "uploads/products");
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_ROOT),
  filename: (req, file, cb) => {
    const name = path.parse(file.originalname).name.replace(/\s+/g, "-");
    cb(null, `${name}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

function fileFilter(req, file, cb) {
  const allowed = /jpeg|jpg|png|webp|gif/i;
  if (allowed.test(path.extname(file.originalname))) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
}

const uploadImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).array("images", 6);

async function processImages(files) {
  const processed = [];
  for (const file of files) {
    const base = path.parse(file.filename).name;
    const outputPath = path.join(UPLOAD_ROOT, `${base}.webp`);

    await sharp(file.path)
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outputPath);

    fs.unlinkSync(file.path); // remove original

    processed.push({
      url: `/uploads/products/${base}.webp`,
      alt: "",
      isPrimary: false,
    });
  }
  return processed;
}

// ========== AUTH ROUTES ==========

app.post("/users/signup", async (req, res) => {
  try {
    const { email, password, role, firstName, lastName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email & password required" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      email,
      password: hashedPassword,
      role: role || "user",
      firstName,
      lastName,
      name: `${firstName || ""} ${lastName || ""}`.trim(),
    });

    await user.save();

    res.status(201).json({
      message: "User created",
      token: generateToken(user),
      user: { email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Error during signup", error: err.message });
  }
});

app.post("/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Incorrect password" });

    const token = generateToken(user);

    res.json({ token, user: { email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: "Error during login", error: err.message });
  }
});

// ========== AI ROUTES ==========
const openaiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({
  apiKey: openaiKey || "sk-test-fallback",
});

app.post("/api/ai/ask", async (req, res) => {
  if (!openaiKey) {
    return res.status(500).json({ error: "OpenAI API key is not set" });
  }

  try {
    const { question, history } = req.body;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [...(history || []), { role: "user", content: question }],
    });

    res.json({ answer: completion.choices[0].message.content });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "AI request failed" });
  }
});

// ========== PRODUCT ROUTES ==========

// Get all products
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Get single product
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// Create new product
app.post("/api/products", protect, async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    const saved = await newProduct.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: "Failed to create product" });
  }
});

// Update product
app.put("/api/products/:id", protect, async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ error: "Product not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "Failed to update product" });
  }
});

// Delete product
app.delete("/api/products/:id", protect, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product" });
  }
});

// Upload product images
app.post("/api/products/upload", protect, (req, res) => {
  uploadImages(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const processed = await processImages(req.files);
      res.json({ files: processed });
    } catch (e) {
      res.status(500).json({ error: "Image processing failed" });
    }
  });
});

// ========== START SERVER ==========
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
