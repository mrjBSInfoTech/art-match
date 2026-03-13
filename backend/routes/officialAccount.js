import express from "express";
import db from "../database/db.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import bcrypt from "bcrypt";

const router = express.Router();

// 🟢 Get all official accounts
router.get("/", authenticateToken, (req, res) => {
  const sql = `
    SELECT 
      official_account_id,
      username,
      account_type,
      can_add,
      can_edit,
      can_delete
    FROM official_account
    ORDER BY official_account_id ASC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// 🟢 Get all officials with their account information (JOIN)
router.get("/withAccounts/all", authenticateToken, (req, res) => {
  const sql = `
    SELECT 
      o.official_id,
      o.official_account_id,
      o.first_name,
      o.middle_name,
      o.last_name,
      o.position,
      o.dob,
      o.address,
      o.image,
      o.phone_number,
      o.email,
      oa.username,
      oa.account_type,
      oa.can_add,
      oa.can_edit,
      oa.can_delete
    FROM official o
    LEFT JOIN official_account oa ON o.official_account_id = oa.official_account_id
    ORDER BY o.last_name, o.first_name ASC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// 🔍 Get single official account by ID
router.get("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      official_account_id,
      username,
      account_type,
      can_add,
      can_edit,
      can_delete
    FROM official_account
    WHERE official_account_id = ?
  `;
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "Official account not found" });
    res.json(results[0]);
  });
});

// ➕ Add new official account
// This endpoint accepts official_id, position, password, account_type and permissions
router.post("/", authenticateToken, async (req, res) => {
  const { password, official_id, position, account_type = "Staff", can_add = 0, can_edit = 0, can_delete = 0 } = req.body;

  if (!password) {
    return res.status(400).json({ error: "Please provide a password." });
  }

  if (!official_id) {
    return res.status(400).json({ error: "Please provide an official_id." });
  }

  if (!position) {
    return res.status(400).json({ error: "Please provide a position." });
  }

  // Validate account type
  if (!['Admin', 'Staff'].includes(account_type)) {
    return res.status(400).json({ error: "Invalid account type. Must be 'Admin' or 'Staff'." });
  }

  try {
    // Check if official exists and doesn't already have an account
    const checkSql = "SELECT official_id, official_account_id FROM official WHERE official_id = ?";
    db.query(checkSql, [official_id], async (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "Official not found." });
      }

      if (results[0].official_account_id !== null) {
        return res.status(400).json({ error: "This official already has an account." });
      }

      // Use provided account_type and permissions (no auto-assign)
      const finalAccountType = account_type || "Staff";
      const finalCanAdd = can_add ? 1 : 0;
      const finalCanEdit = can_edit ? 1 : 0;
      const finalCanDelete = can_delete ? 1 : 0;

      // Generate username: B415Z42001, B415Z42002, etc.
      const getSql = "SELECT username FROM official_account WHERE username LIKE 'B415Z42%' ORDER BY username DESC LIMIT 1";
      
      db.query(getSql, async (err, results) => {
        let newUsername = "B415Z42001"; // Default first username
        
        if (results && results.length > 0) {
          const lastUsername = results[0].username;
          const numberPart = parseInt(lastUsername.slice(7)); // Extract number part after "B415Z42"
          const newNumber = numberPart + 1;
          newUsername = `B415Z42${String(newNumber).padStart(3, '0')}`; // Pad with zeros
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
          INSERT INTO official_account 
          (username, password, account_type, can_add, can_edit, can_delete) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(
          sql,
          [newUsername, hashedPassword, finalAccountType, finalCanAdd, finalCanEdit, finalCanDelete],
          (err, result) => {
            if (err) {
              if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: "Username already exists." });
              }
              return res.status(500).json({ error: err.message });
            }

            // Update official with the new account_id
            const updateOfficialSql = "UPDATE official SET official_account_id = ? WHERE official_id = ?";
            db.query(updateOfficialSql, [result.insertId, official_id], (err) => {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              res.json({ 
                message: "✅ Official account added successfully", 
                id: result.insertId, 
                username: newUsername,
                account_type: finalAccountType,
                can_add: finalCanAdd,
                can_edit: finalCanEdit,
                can_delete: finalCanDelete
              });
            });
          }
        );
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✏️ Update official account
router.put("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { username, password, account_type, can_add, can_edit, can_delete } = req.body;

  // Validate account type if provided
  if (account_type && !['Admin', 'Staff'].includes(account_type)) {
    return res.status(400).json({ error: "Invalid account type. Must be 'Admin' or 'Staff'." });
  }

  try {
    let sql, params;

    // Build dynamic update query based on what fields are provided
    const updates = [];
    const values = [];

    // Only update username if provided
    if (username) {
      updates.push("username = ?");
      values.push(username);
    }

    // Only update password if provided (hash it)
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push("password = ?");
      values.push(hashedPassword);
    }

    // Update account_type if provided
    if (account_type) {
      updates.push("account_type = ?");
      values.push(account_type);
    }

    // Update permissions if provided (can be 0 or 1)
    if (can_add !== undefined) {
      updates.push("can_add = ?");
      values.push(can_add ? 1 : 0);
    }

    if (can_edit !== undefined) {
      updates.push("can_edit = ?");
      values.push(can_edit ? 1 : 0);
    }

    if (can_delete !== undefined) {
      updates.push("can_delete = ?");
      values.push(can_delete ? 1 : 0);
    }

    // If no updates provided, return error
    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update." });
    }

    // Add id to params
    values.push(id);

    // Build final query
    sql = `UPDATE official_account SET ${updates.join(", ")} WHERE official_account_id = ?`;

    db.query(sql, values, (err) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ error: "Username already exists." });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: "✅ Official account updated successfully" });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ❌ Delete official account
router.delete("/:id", authenticateToken, (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM official_account WHERE official_account_id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "✅ Official account deleted successfully" });
  });
});

export default router;
