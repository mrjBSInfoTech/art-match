import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../database/db.js";

const router = express.Router();
// Login route
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  const sql = `
  SELECT 
    oa.official_account_id, 
    oa.username, 
    oa.password, 
    oa.account_type, 
    oa.can_add, 
    oa.can_edit, 
    oa.can_delete,
    o.first_name, 
    o.last_name, 
    o.position,
    o.image
  FROM official_account oa
  INNER JOIN official o ON oa.official_account_id = o.official_account_id
  WHERE oa.username = ?`;

  db.query(sql, [username], (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (result.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result[0];
    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.official_account_id,
        username: user.username,
        account_type: user.account_type,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.json({
      token,
      username: user.username,
      account_type: user.account_type,
      first_name: user.first_name,
      last_name: user.last_name,
      position: user.position,
      image: user.image,
      can_add: user.can_add,
      can_edit: user.can_edit,
      can_delete: user.can_delete,
    });
  });
});

export default router;
