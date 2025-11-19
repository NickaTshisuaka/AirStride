import { getDB } from "../config/database.js";

export const getUserByEmail = async (req, res) => {
  try {
    const user = await getDB().collection("users").findOne({ email: req.params.email });

    if (!user) return res.status(404).json({ error: "User not found" });

    delete user.passwordHash;
    res.json(user);
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Server error fetching user" });
  }
};

export const updateUserByEmail = async (req, res) => {
  try {
    const allowed = ["firstName", "lastName", "phone", "address", "profileImg"];
    const updates = {};

    for (const field of allowed) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: "No valid fields to update" });

    const result = await getDB()
      .collection("users")
      .findOneAndUpdate(
        { email: req.params.email },
        { $set: updates },
        { returnDocument: "after" }
      );

    if (!result.value) return res.status(404).json({ error: "User not found" });

    delete result.value.passwordHash;
    res.json(result.value);
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ error: "Server error updating user" });
  }
};
