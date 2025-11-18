import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  firstName: { 
    type: String, 
    required: true 
  },
  lastName: { 
    type: String, 
    required: true 
  },
  // Virtual field to get full name
  fullName: {
    type: String,
    get: function() {
      return `${this.firstName} ${this.lastName}`;
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Remove the 'name' field requirement if it exists
// Make sure there's no 'name' field in your schema

const User = mongoose.model("User", userSchema);

export default User;