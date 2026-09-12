import express from "express";
import db from "../../database/db.js";
import { authenticateBuyer } from "../../middleware/buyerAuthMiddleware.js";

const router = express.Router();
const addressFields = ["region", "province", "city", "barangay", "postal_code", "street_name"];
const requiredAddressFields = addressFields.filter((field) => field !== "province");

const validateAddress = (body) => {
	for (const field of requiredAddressFields) {
		if (!body[field] || !String(body[field]).trim()) return `${field} is required`;
	}
	return null;
};

const clearCurrentAddress = (customerId, callback) => {
	db.query("UPDATE address SET is_current = 0 WHERE customer_id = ?", [customerId], callback);
};

router.get("/", authenticateBuyer, (req, res) => {
	db.query(
		"SELECT address_id, customer_id, region, province, city, barangay, postal_code, street_name, is_current FROM address WHERE customer_id = ? ORDER BY is_current DESC, address_id DESC",
		[req.user.customer_id],
		(err, results) => {
			if (err) return res.status(500).json({ message: "Database error" });
			res.json(results);
		},
	);
});

router.get("/:id", authenticateBuyer, (req, res) => {
	db.query(
		"SELECT address_id, customer_id, region, province, city, barangay, postal_code, street_name, is_current FROM address WHERE address_id = ? AND customer_id = ?",
		[req.params.id, req.user.customer_id],
		(err, results) => {
			if (err) return res.status(500).json({ message: "Database error" });
			if (!results.length) return res.status(404).json({ message: "Address not found" });
			res.json(results[0]);
		},
	);
});

router.post("/", authenticateBuyer, (req, res) => {
	const validationError = validateAddress(req.body);
	if (validationError) return res.status(400).json({ message: validationError });

	const isCurrent = req.body.is_current === undefined || Boolean(req.body.is_current);
	const insert = () => db.query(
		"INSERT INTO address (customer_id, region, province, city, barangay, postal_code, street_name, is_current) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		[req.user.customer_id, ...addressFields.map((field) => String(req.body[field] ?? "").trim()), isCurrent ? 1 : 0],
		(err, result) => {
			if (err) return res.status(500).json({ message: "Database error" });
			res.status(201).json({ message: "Address added successfully", address_id: result.insertId });
		},
	);

	if (isCurrent) clearCurrentAddress(req.user.customer_id, insert);
	else insert();
});

router.put("/:id", authenticateBuyer, (req, res) => {
	const validationError = validateAddress(req.body);
	if (validationError) return res.status(400).json({ message: validationError });

	const isCurrent = Boolean(req.body.is_current);
	const update = () => db.query(
		"UPDATE address SET region = ?, province = ?, city = ?, barangay = ?, postal_code = ?, street_name = ?, is_current = ? WHERE address_id = ? AND customer_id = ?",
		[...addressFields.map((field) => String(req.body[field] ?? "").trim()), isCurrent ? 1 : 0, req.params.id, req.user.customer_id],
		(err, result) => {
			if (err) return res.status(500).json({ message: "Database error" });
			if (!result.affectedRows) return res.status(404).json({ message: "Address not found" });
			res.json({ message: "Address updated successfully" });
		},
	);

	if (isCurrent) clearCurrentAddress(req.user.customer_id, update);
	else update();
});

router.delete("/:id", authenticateBuyer, (req, res) => {
	db.query("DELETE FROM address WHERE address_id = ? AND customer_id = ?", [req.params.id, req.user.customer_id], (err, result) => {
		if (err) return res.status(500).json({ message: "Database error" });
		if (!result.affectedRows) return res.status(404).json({ message: "Address not found" });
		res.json({ message: "Address deleted successfully" });
	});
});

export default router;
