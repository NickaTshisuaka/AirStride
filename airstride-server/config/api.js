// src/config/api.js
// Create this file to centralize your API URL

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  products: `${API_BASE_URL}/api/products`,
  orders: `${API_BASE_URL}/api/orders`,
  users: `${API_BASE_URL}/users`,
  signup: `${API_BASE_URL}/signup`,
  login: `${API_BASE_URL}/login`,
};

export default API_BASE_URL;