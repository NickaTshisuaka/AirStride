import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import aiRouter from "./routes/ai.js";
import multer from "multer";
import path from "path";
import User from "./models/User.js";
import Product from "./models/Product.js";
import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/auth.js";

dotenv.config({ quiet: true });
const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET || "superSecretKey";

if (!process.env.OPENAI_API_KEY) {
  console.warn(
    "⚠️  OPENAI_API_KEY is missing! AI routes will fail until you set it in .env"
  );
}

app.use(express.json());

// Custom CORS configuration
const allowedOrigins = ["http://localhost:5173"]; 
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

app.use("/uploads", express.static("uploads"));
app.use("/api/ai", aiRouter);
app.use("/api/products", productRoutes);

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

app.post("/api/products/upload", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const { name, price } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "Image is required" });
    }

    const newProduct = new Product({
      Product_name: name,
      Price: price,
      img: req.file.filename,
      images: [
        {
          url: `/uploads/${req.file.filename}`,
          alt: name,
          isPrimary: true,
        },
      ],
      thumbnailUrl: `/uploads/${req.file.filename}`,
    });

    await newProduct.save();
    res.json(newProduct);
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const generateToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
    expiresIn: "1h",
  });
};

app.post("/users/signup", async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  try {
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        success: false,
        error: "All fields are required" 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: "Password must be at least 6 characters long" 
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: "User already exists" 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    
    const user = new User({ 
      email, 
      password: hashedPassword,
      name: fullName, 
      firstName: firstName.trim(),
      lastName: lastName.trim()
    });
    
    await user.save();
    
    res.status(201).json({
      success: true,
      message: "User created successfully",
      token: generateToken(user),
    });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ 
      success: false,
      error: err.message || "Internal server error" 
    });
  }
});

app.post("/users/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    res.json({
      message: "Login successful",
      token: generateToken(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));