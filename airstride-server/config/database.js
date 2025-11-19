import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGO_URI);
let db;

export async function connectDB() {
  await client.connect();
  db = client.db();
  console.log("MongoDB connected");
}

export function getDB() {
  return db;
}
