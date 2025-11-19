import express from "express";
import { firebaseAuth } from "../middleware/firebaseAuth.js";
import { getUserByEmail, updateUserByEmail } from "../controllers/userController.js";

const router = express.Router();

router.get("/email/:email", firebaseAuth, getUserByEmail);
router.put("/email/:email", firebaseAuth, updateUserByEmail);

export default router;
