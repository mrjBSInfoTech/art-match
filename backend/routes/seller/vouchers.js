import { randomBytes } from "node:crypto";
import express from "express";
import db from "../../database/db.js";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";
import { logSellerAudit } from "../../utils/auditLogger.js";

const router = express.Router();
const validDiscountTypes = new Set(["fixed", "percentage", "freebie"]);

const parseDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value
    ? null
    : value;
};

const normalizeArtworkIds = (value) => {
  if (!Array.isArray(value)) return null;
  const ids = value.map(Number);
  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) return null;
  return [...new Set(ids)];
};

const normalizeVoucherCode = (value) => {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9-]{3,20}$/.test(code) ? code : null;
};

const isVoucherCodeActive = async (connection, code) => {
  const matches = await query(
    connection,
    `SELECT voucher_id FROM seller_voucher
     WHERE UPPER(code) = ?
       AND starts_on <= CURRENT_DATE()
       AND expires_on >= CURRENT_DATE()
     LIMIT 1`,
    [code],
  );
  return matches.length > 0;
};

const query = (connection, sql, values = []) =>
  connection.query(sql, values).then(([results]) => results);

router.get("/availability", authenticateSeller, async (req, res) => {
  const code = normalizeVoucherCode(req.query.code);
  if (!code) {
    return res.status(400).json({
      message: "Voucher codes must be 3–20 letters, numbers, or hyphens.",
    });
  }

  try {
    const available = !(await isVoucherCodeActive(db.promise(), code));
    res.json({ code, available });
  } catch (error) {
    console.error("Unable to check voucher code availability:", error);
    res.status(500).json({ message: "Unable to check voucher code availability." });
  }
});

router.get("/", authenticateSeller, async (req, res) => {
  const studentId = req.user?.student_id;
  try {
    const vouchers = await db.promise().query(
      `SELECT voucher_id, code, discount_type, discount_value, minimum_purchase,
              DATE_FORMAT(starts_on, '%Y-%m-%d') AS starts_on,
              DATE_FORMAT(expires_on, '%Y-%m-%d') AS expires_on,
              applies_to_all, created_at
       FROM seller_voucher
       WHERE student_id = ?
       ORDER BY created_at DESC, voucher_id DESC`,
      [studentId],
    );
    const [artworkRows] = await db.promise().query(
      `SELECT va.voucher_id, a.artwork_id, a.title
       FROM seller_voucher_artwork va
       JOIN seller_voucher v ON v.voucher_id = va.voucher_id
       JOIN artwork a ON a.artwork_id = va.artwork_id
       WHERE v.student_id = ?
       ORDER BY a.title`,
      [studentId],
    );
    const artworkByVoucher = new Map();
    for (const row of artworkRows) {
      const items = artworkByVoucher.get(row.voucher_id) || [];
      items.push({ artwork_id: row.artwork_id, title: row.title });
      artworkByVoucher.set(row.voucher_id, items);
    }
    res.json(
      vouchers[0].map((voucher) => ({
        ...voucher,
        artwork: artworkByVoucher.get(voucher.voucher_id) || [],
      })),
    );
  } catch (error) {
    console.error("Unable to load seller vouchers:", error);
    res.status(500).json({ message: "Unable to load vouchers." });
  }
});

router.delete("/:voucherId", authenticateSeller, async (req, res) => {
  const studentId = req.user?.student_id;
  const voucherId = Number(req.params.voucherId);
  if (!Number.isSafeInteger(voucherId) || voucherId <= 0) {
    return res.status(400).json({ message: "Invalid voucher ID." });
  }

  try {
    const [result] = await db.promise().query(
      "DELETE FROM seller_voucher WHERE voucher_id = ? AND student_id = ?",
      [voucherId, studentId],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Voucher not found." });
    }

    await logSellerAudit(req.user, {
      action: "DELETE_VOUCHER",
      information: `Voucher ${voucherId} was deleted.`,
    });
    res.json({ message: "Voucher deleted." });
  } catch (error) {
    console.error("Unable to delete seller voucher:", error);
    res.status(500).json({ message: "Unable to delete voucher." });
  }
});

router.post("/", authenticateSeller, async (req, res) => {
  const studentId = req.user?.student_id;
  const {
    discount_type: discountType,
    discount_value: rawDiscountValue,
    minimum_purchase: rawMinimumPurchase,
    starts_on: rawStartsOn,
    expires_on: rawExpiresOn,
    applies_to_all: appliesToAll,
    artwork_ids: rawArtworkIds,
    code: rawCode,
  } = req.body || {};
  const customCode =
    rawCode === undefined || rawCode === null || rawCode === ""
      ? null
      : normalizeVoucherCode(rawCode);

  if (rawCode && !customCode) {
    return res.status(400).json({
      message: "Voucher codes must be 3–20 letters, numbers, or hyphens.",
    });
  }

  if (!validDiscountTypes.has(discountType)) {
    return res.status(400).json({ message: "Choose a valid discount type." });
  }

  const discountValue =
    discountType === "freebie" ? null : Number(rawDiscountValue);
  if (
    discountType !== "freebie" &&
    (!Number.isFinite(discountValue) ||
      discountValue <= 0 ||
      (discountType === "percentage" && discountValue > 100))
  ) {
    return res.status(400).json({
      message:
        discountType === "percentage"
          ? "Percentage discount must be greater than 0 and at most 100."
          : "Enter a valid fixed discount amount greater than 0.",
    });
  }

  const minimumPurchase = Number(rawMinimumPurchase);
  if (!Number.isFinite(minimumPurchase) || minimumPurchase < 0) {
    return res
      .status(400)
      .json({ message: "Minimum purchase must be zero or greater." });
  }

  const startsOn = parseDate(rawStartsOn);
  const expiresOn = parseDate(rawExpiresOn);
  if (!startsOn || !expiresOn || startsOn > expiresOn) {
    return res.status(400).json({
      message: "Enter valid dates and make sure expiry is on or after the start date.",
    });
  }

  if (typeof appliesToAll !== "boolean") {
    return res
      .status(400)
      .json({ message: "Choose whether the voucher applies to all listings." });
  }
  const artworkIds = appliesToAll ? [] : normalizeArtworkIds(rawArtworkIds);
  if (!appliesToAll && (!artworkIds || artworkIds.length === 0)) {
    return res.status(400).json({
      message: "Select at least one of your listings for this voucher.",
    });
  }

  let connection;
  try {
    connection = await db.promise().getConnection();
    if (artworkIds.length) {
      const owned = await query(
        connection,
        `SELECT artwork_id FROM artwork
         WHERE student_id = ? AND artwork_id IN (?)`,
        [studentId, artworkIds],
      );
      if (owned.length !== artworkIds.length) {
        return res.status(400).json({
          message: "One or more selected listings do not belong to your shop.",
        });
      }
    }

    let voucherId;
    let code = customCode;
    let created = false;
    for (let attempt = 0; attempt < (customCode ? 1 : 5) && !created; attempt += 1) {
      code =
        customCode || `ART-${randomBytes(5).toString("hex").toUpperCase()}`;
      const lockName = `seller-voucher:${code}`;
      const lockResult = await query(
        connection,
        "SELECT GET_LOCK(?, 5) AS acquired",
        [lockName],
      );
      if (Number(lockResult[0]?.acquired) !== 1) {
        throw new Error("Unable to lock the voucher code for creation.");
      }

      try {
        if (await isVoucherCodeActive(connection, code)) {
          if (customCode) {
            return res.status(409).json({
              message: "This voucher code is currently active. Try another.",
            });
          }
          continue;
        }

        await connection.beginTransaction();
        try {
          const result = await query(
            connection,
            `INSERT INTO seller_voucher
              (student_id, code, discount_type, discount_value, minimum_purchase,
               starts_on, expires_on, applies_to_all)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              studentId,
              code,
              discountType,
              discountValue,
              minimumPurchase,
              startsOn,
              expiresOn,
              appliesToAll,
            ],
          );
          voucherId = result.insertId;
          if (artworkIds.length) {
            await query(
              connection,
              `INSERT INTO seller_voucher_artwork (voucher_id, artwork_id)
               VALUES ?`,
              [artworkIds.map((artworkId) => [voucherId, artworkId])],
            );
          }
          await connection.commit();
          created = true;
        } catch (error) {
          await connection.rollback();
          throw error;
        }
      } finally {
        await query(connection, "SELECT RELEASE_LOCK(?)", [lockName]);
      }
    }

    if (!created) {
      throw new Error("Unable to generate a unique voucher code.");
    }
    await logSellerAudit(req.user, {
      action: "CREATE_VOUCHER",
      information: `Voucher ${code} (${discountType}) was created, valid ${startsOn} through ${expiresOn}.`,
    });
    res.status(201).json({
      voucher_id: voucherId,
      code,
      discount_type: discountType,
      discount_value: discountValue,
      minimum_purchase: minimumPurchase,
      starts_on: startsOn,
      expires_on: expiresOn,
      applies_to_all: appliesToAll,
      artwork: artworkIds,
    });
  } catch (error) {
    console.error("Unable to create seller voucher:", error);
    res.status(500).json({ message: "Unable to create voucher." });
  } finally {
    connection?.release();
  }
});

export default router;
