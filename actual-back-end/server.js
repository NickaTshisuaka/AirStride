const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173', // Frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb+srv://nicka20060108:Tshisuaka.19@airstride.w9zddd0.mongodb.net/')
  .then(() => console.log(' Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Updated User Schema
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
});
const User = mongoose.model('users', userSchema);

// Basic Auth Middleware
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).send('Missing or invalid Authorization header');
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [email, password] = credentials.split(':');

  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).send('Invalid credentials');
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(500).send('Server error');
  }
};

// Root Route
app.get('/', (req, res) => {
  res.send(' API is running');
});

//  Updated Signup to expect firstName & lastName
app.post('/users/signup', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  console.log('Signup payload:', req.body);

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ firstName, lastName, email, password: hashed });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(400).json({ error: 'Email may already be in use' });
  }
});

//  Updated Login Response to return user details
app.post('/users/login', authMiddleware, (req, res) => {
  const { firstName, lastName, email } = req.user;
  res.json({
    message: 'Login successful',
    user: { firstName, lastName, email }
  });
});

//  Protected Products Route
app.get('/api/products', authMiddleware, (req, res) => {
  res.json([
    { id: 1, name: 'HoverPod X', price: 1200 },
    { id: 2, name: 'HoverSneak Elite', price: 950 },
  ]);
});

// Start Server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
});
