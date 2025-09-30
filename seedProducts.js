import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/Product.js"; // adjust path if needed

dotenv.config();

const products = [
  {
    name: "AirStride Breathing Trainer",
    price: 899,
    tags: ["fitness", "breathing", "trainer"],
    description: "Improve your endurance and lung capacity with the AirStride breathing trainer.",
    image: "prod1.jpeg", // matches /images folder
  },
  {
    name: "AirStride Jogging Shoes",
    price: 1299,
    tags: ["shoes", "running", "jogging"],
    description: "Lightweight and durable shoes designed for runners.",
    image: "prod2.jpeg",
  },
  {
    name: "AirStride Resistance Bands",
    price: 299,
    tags: ["fitness", "strength", "bands"],
    description: "High-quality resistance bands for strength and mobility training.",
    image: "prod3.jpeg",
  },
  {
    name: "AirStride Smartwatch",
    price: 2499,
    tags: ["wearable", "fitness", "tracking"],
    description: "Track your workouts, heart rate, and sleep with the AirStride smartwatch.",
    image: "prod4.jpeg",
  },
  {
    name: "AirStride Water Bottle",
    price: 199,
    tags: ["hydration", "fitness", "accessory"],
    description: "Stay hydrated with our eco-friendly and durable water bottle.",
    image: "prod5.jpeg",
  },
  {
    name: "AirStride Gym Bag",
    price: 499,
    tags: ["fitness", "bag", "accessory"],
    description: "Carry your essentials with the stylish and spacious AirStride gym bag.",
    image: "prod6.jpeg",
  },
];

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected...");
    await Product.deleteMany({});
    await Product.insertMany(products);
    console.log("Products seeded successfully!");
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error("Error seeding products:", err);
    mongoose.connection.close();
  });
