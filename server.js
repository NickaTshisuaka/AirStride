// server.js
// Basic Express server with MongoDB, full CRUD for products & orders,
// users collection for signup + Basic Auth protected endpoints.
// Dependencies: express, mongodb, dotenv, base-64, bcryptjs, axios (optional)

import dotenv from 'dotenv';
import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import base64 from 'base-64'; // for decoding Basic Auth header
import bcrypt from 'bcryptjs'; // for hashing passwords
import cors from 'cors'
// import admin from 'firebase-admin'
import fs from "fs";
// axios is installed per requirement but not used here. It is useful if you want to call other APIs.

dotenv.config(); // loads .env variables into process.env

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI missing in .env — server will exit.');
  process.exit(1);
}

// const serviceAccount = JSON.parse(
//   fs.readFileSync("./airstride-3317d-firebase-adminsdk-fbsvc-1163621a02.json","utf8")
// );

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// You can now use admin.auth() or admin.firestore() from your server
const database= admin.firestore()

// Create a MongoClient and connect once at startup
const client = new MongoClient(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let db; // will hold the connected database instance

async function startServer() {
  try {
    await client.connect();
    db = client.db(); // default DB from connection string (or specify name: client.db('airstride'))
    console.log('Connected to MongoDB');
    
    // Start the Express server after DB connected
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  }
}
startServer();

/* ----------------------
Authentication Middleware
----------------------
This middleware enforces Basic Auth for routes that require it.
- It expects Authorization: Basic base64(username:password)
- It decodes credentials, finds the user in the 'users' collection,
then verifies the password using bcrypt.compare.
- If valid, sets req.user = user (without passwordHash) and calls next()
- If not valid, returns 401 Unauthorized
*/
/* ----------------------
   Firebase Authentication Middleware
   ----------------------
   Verifies Firebase ID token from Authorization: Bearer <token>
*/
async function firebaseAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      // Verify the Firebase ID token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified
      };
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (err) {
    console.error('firebaseAuth error', err);
    res.status(500).json({ error: 'Server error in authentication' });
  }
}


/* ----------------------
Helper: validate ObjectId
---------------------- */
function isValidObjectId(id) {
  try {
    return ObjectId.isValid(id) && (String)(new ObjectId(id)) === id;
  } catch {
    return false;
  }
}
app.use(express.json()); // allow JSON bodies in requests
// Allow Vite dev server and other trusted origins to access this API
app.use(
  cors({
    origin: (origin, cb) => {
      // allow requests with no origin like curl/postman
      if (!origin) return cb(null, true);
      const allowed =
       ["http://localhost:5173",
         "http://127.0.0.1:5173"];
      if (allowed.indexOf(origin) !== -1) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
// Configuration

/* ----------------------
PUBLIC ROUTE: SIGNUP
- This endpoint must remain public (no Basic Auth).
- It stores the user with bcrypt-hashed password.
Request body (JSON):
{ "username": "alice", "password": "pass123", "email": "a@b.com" }
   Responses:
     201 Created with created user (without password)
     400 Bad Request for missing/invalid fields
     409 Conflict if username already exists
*/
app.post('/signup', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const usersColl = db.collection('users');
    const existing = await usersColl.findOne({ username });
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Hash password with bcrypt (salt rounds 10)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = {
      username,
      email: email || null,
      passwordHash,
      createdAt: new Date(),
      // add any other user fields as needed
    };

    const result = await usersColl.insertOne(newUser);

    // Remove passwordHash from response
    delete newUser.passwordHash;
    newUser._id = result.insertedId;

    res.status(201).json({ message: 'User created', user: newUser });
  } catch (err) {
    console.error('/signup error', err);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

/* ----------------------
   OPTIONAL: LOGIN endpoint (public)
   - Accepts username & password, verifies and returns a success message.
   - Not strictly required if Basic Auth will be used by clients, but useful for testing.
   Request body:
     { "username":"alice", "password":"pass123" }
*/
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });

    const user = await db.collection('users').findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // For Basic Auth clients, they can use Basic base64(username:password) header.
    // We return a success message — no JWT used here per rubric (Basic Auth implemented separately).
    res.json({ message: 'Login successful' });
  } catch (err) {
    console.error('/login error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ----------------------
   PRODUCTS CRUD
   All product routes require authentication.
   Product shape example:
     {
       name: "Running Shoe",
       description: "Lightweight shoe",
       price: 99.99,
       stock: 50,
       createdAt: Date
     }
*/
const productsColl = () => db.collection('products');

// Create product
app.post('/api/products', firebaseAuth, async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;
    if (!name || typeof price !== 'number') {
      return res.status(400).json({ error: 'Invalid product data — name and numeric price required' });
    }

    const product = {
      name,
      description: description || '',
      price,
      stock: typeof stock === 'number' ? stock : 0,
      createdAt: new Date(),
    };

    const result = await productsColl().insertOne(product);
    product._id = result.insertedId;

    res.status(201).json({ message: 'Product created', product });
  } catch (err) {
    console.error('POST /products error', err);
    res.status(500).json({ error: 'Server error creating product' });
  }
});

// Get all products
app.get('/api/products', firebaseAuth, async (req, res) => {
  try {
    const items = await productsColl().find({}).toArray();
    res.json({ products: items });
  } catch (err) {
    console.error('GET /products error', err);
    res.status(500).json({ error: 'Server error fetching products' });
  }
});

// Get product by id
app.get('/api/products/:id', firebaseAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid product id' });

    const product = await productsColl().findOne({ _id: new ObjectId(id) });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    res.json({ product });
  } catch (err) {
    console.error('GET /products/:id error', err);
    res.status(500).json({ error: 'Server error fetching product' });
  }
});

// Update product
app.put('/api/products/:id', firebaseAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid product id' });

    const update = {};
    const allowed = ['name', 'description', 'price', 'stock'];
    for (const key of allowed) {
      if (key in req.body) update[key] = req.body[key];
    }
    if (Object.keys(update).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    const result = await productsColl().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result.value) return res.status(404).json({ error: 'Product not found' });

    res.json({ message: 'Product updated', product: result.value });
  } catch (err) {
    console.error('PUT /products/:id error', err);
    res.status(500).json({ error: 'Server error updating product' });
  }
});

// Delete product
app.delete('/api/products/:id', firebaseAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid product id' });

    const result = await productsColl().deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Product not found' });

    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('DELETE /products/:id error', err);
    res.status(500).json({ error: 'Server error deleting product' });
  }
});

/* ----------------------
   ORDERS CRUD
   All order routes require authentication.
   Order example:
   {
     userId: ObjectId,
     items: [{ productId: ObjectId, quantity: 2, price: 99.99 }],
     total: 199.98,
     status: "pending" // or shipped, cancelled
   }
*/
const ordersColl = () => db.collection('orders');

// Create order
app.post('/api/orders', firebaseAuth, async (req, res) => {
  try {
    const { items, status } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Basic validation of items
    let total = 0;
    for (const it of items) {
      if (!it.productId || typeof it.quantity !== 'number' || it.quantity <= 0) {
        return res.status(400).json({ error: 'Invalid order item structure' });
      }
      // For simplicity, we expect client to pass price for the item; in a real app you would lookup product price
      const itemPrice = typeof it.price === 'number' ? it.price : 0;
      total += itemPrice * it.quantity;
    }

    const order = {
      userId: req.user._id ? req.user._id : null, // associate order to authenticated user (if exists)
      items,
      total,
      status: status || 'pending',
      createdAt: new Date(),
    };

    const result = await ordersColl().insertOne(order);
    order._id = result.insertedId;

    res.status(201).json({ message: 'Order created', order });
  } catch (err) {
    console.error('POST /orders error', err);
    res.status(500).json({ error: 'Server error creating order' });
  }
});

// Get all orders
app.get('/api/orders', firebaseAuth, async (req, res) => {
  try {
    // Optionally, you could filter orders by user (req.user._id) for non-admins
    const list = await ordersColl().find({}).toArray();
    res.json({ orders: list });
  } catch (err) {
    console.error('GET /orders error', err);
    res.status(500).json({ error: 'Server error fetching orders' });
  }
});

// Get order by id
app.get('/api/orders/:id', firebaseAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid order id' });

    const order = await ordersColl().findOne({ _id: new ObjectId(id) });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    res.json({ order });
  } catch (err) {
    console.error('GET /orders/:id error', err);
    res.status(500).json({ error: 'Server error fetching order' });
  }
});

// Update order
app.put('/api/orders/:id', firebaseAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid order id' });

    const allowed = ['status', 'items'];
    const update = {};
    for (const k of allowed) if (k in req.body) update[k] = req.body[k];

    if (Object.keys(update).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    const result = await ordersColl().findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result.value) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order updated', order: result.value });
  } catch (err) {
    console.error('PUT /orders/:id error', err);
    res.status(500).json({ error: 'Server error updating order' });
  }
});

// Delete order
app.delete('/api/orders/:id', firebaseAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid order id' });

    const result = await ordersColl().deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Order not found' });

    res.json({ message: 'Order deleted' });
  } catch (err) {
    console.error('DELETE /orders/:id error', err);
    res.status(500).json({ error: 'Server error deleting order' });
  }
});

/* ----------------------
   404 handler and error handler (fallbacks)
*/
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing MongoDB connection and exiting');
  await client.close();
  process.exit(0);
});
