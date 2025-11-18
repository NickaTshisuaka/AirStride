// server/models/Activity.js
import mongoose from 'mongoose';

// Define the Activity schema
const activitySchema = new mongoose.Schema({
  userId: {
    type: String, // Optional, for logged-in users (Firebase UID)
    required: false,
  },
  eventType: {
    type: String, // e.g., 'PAGE_VISIT', 'BUTTON_CLICK', 'PRODUCT_VIEW', 'LOGIN', 'SIGNUP', 'LOGOUT'
    required: true,
  },
  details: {
    type: Object, // Additional details like page name, button name, product ID
    required: false,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now, // Automatically set to current date/time
  },
});

// Create and export the Mongoose model
export default mongoose.model('Activity', activitySchema);