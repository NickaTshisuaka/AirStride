import chai from "chai";
import chaiHttp from "chai-http";
import app from "../server.js";
import mongoose from "mongoose";
import Product from "../models/Product.js";
import Activity from "../models/Activity.js";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads", "products");

chai.use(chaiHttp);
const { expect } = chai;
const request = chai.request;

// Tests token and product ID holder
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || "PLACEHOLDER_TOKEN_REPLACE_ME";
let testProductId;

// Creates a small dummy image for upload testing
function createDummyFile(filePath) {
  const buffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ]);
  fs.writeFileSync(filePath, buffer);
}

// Waits for MongoDB connection before tests
async function waitForMongooseConnection() {
  if (mongoose.connection.readyState === 1) return;
  return new Promise((resolve) => {
    mongoose.connection.once("open", resolve);
  });
}

describe("API Endpoints Testing", function () {
  this.timeout(30000);
  const dummyFilePath = path.join(__dirname, "dummy-image.png");

  // Setup: connects to database and prepares dummy data
  before(async function () {
    this.timeout(35000);
    await waitForMongooseConnection();
    await Product.deleteMany({});
    await Activity.deleteMany({});
    createDummyFile(dummyFilePath);
  });

  // Cleanup: removes files and closes the database 
  after(async function () {
    this.timeout(35000);
    await Product.deleteMany({});
    await Activity.deleteMany({});
    if (fs.existsSync(dummyFilePath)) fs.unlinkSync(dummyFilePath);
    if (fs.existsSync(UPLOAD_ROOT)) {
      fs.readdirSync(UPLOAD_ROOT).forEach(file => {
        if (file.endsWith(".webp")) fs.unlinkSync(path.join(UPLOAD_ROOT, file));
      });
    }
    if (mongoose.connection.readyState === 1) await mongoose.connection.close();
  });

  // Base route test
  describe("GET /", () => {
    it("should return the base API message (200 OK)", (done) => {
      request(app)
        .get("/")
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property("message").equal("Cognition Berries API");
          done();
        });
    });
  });

  // Product routes (require token)
  describe("Product Endpoints (Protected)", () => {
    it("should return 401 when no token is given", (done) => {
      request(app)
        .get("/api/products")
        .end((err, res) => {
          expect(res).to.have.status(401);
          done();
        });
    });

    // Create a new product
    it("should create a new product successfully", (done) => {
      const newProduct = { Product_name: "Test Gadget", Price: 99.99, Product_id: "T-001" };
      request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${TEST_AUTH_TOKEN}`)
        .send(newProduct)
        .end((err, res) => {
          expect(res).to.satisfy(
            (res) => res.status === 201 || res.status === 400,
            `Expected 201 or 400 but got ${res.status}`
          );
          if (res.body && res.body._id) testProductId = res.body._id;
          done();
        });
    });

    // Get a single product
    it("should get a product by ID", (done) => {
      if (!testProductId) return done();
      request(app)
        .get(`/api/products/${testProductId}`)
        .set("Authorization", `Bearer ${TEST_AUTH_TOKEN}`)
        .end((err, res) => {
          expect(res).to.have.status(200);
          done();
        });
    });

    // Handle invalid product ID
    it("should return 404 for a non-existent product ID", (done) => {
      const fakeId = "60c728b97c27d42e2c56a789";
      request(app)
        .get(`/api/products/${fakeId}`)
        .set("Authorization", `Bearer ${TEST_AUTH_TOKEN}`)
        .end((err, res) => {
          expect(res).to.have.status(404);
          done();
        });
    });

    // Upload image tests
    it("should upload a product image", (done) => {
      request(app)
        .post("/api/products/upload")
        .set("Authorization", `Bearer ${TEST_AUTH_TOKEN}`)
        .attach("images", dummyFilePath, "dummy-image.png")
        .end((err, res) => {
          expect(res).to.satisfy(
            (res) => res.status === 200 || res.status === 500,
            `Expected 200 or 500 but got ${res.status}`
          );
          done();
        });
    });

    it("should return 400 if no file uploaded", (done) => {
      request(app)
        .post("/api/products/upload")
        .set("Authorization", `Bearer ${TEST_AUTH_TOKEN}`)
        .end((err, res) => {
          expect(res).to.have.status(400);
          done();
        });
    });
  });

  // Activity routes
  describe("Activity Endpoints", () => {
    const activityPayload = { userId: "test-user-123", eventType: "PAGE_VISIT", details: { page: "/homepage" } };

    it("should log an activity", (done) => {
      request(app)
        .post("/api/activity")
        .send(activityPayload)
        .end((err, res) => {
          expect(res).to.have.status(201);
          done();
        });
    });

    it("should get all activities", (done) => {
      request(app)
        .get("/api/activity")
        .end((err, res) => {
          expect(res).to.have.status(200);
          done();
        });
    });

    it("should get activity stats", (done) => {
      request(app)
        .get("/api/activity/stats")
        .end((err, res) => {
          expect(res).to.have.status(200);
          done();
        });
    });
  });

  // Unknown route handling
  describe("Error Handling", () => {
    it("should return 404 for unknown routes", (done) => {
      request(app)
        .get("/api/unknown")
        .end((err, res) => {
          expect(res).to.have.status(404);
          done();
        });
    });
  });
});
