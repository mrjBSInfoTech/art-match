import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../database/db.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";
import { logAudit } from "../../utils/auditLogger.js";
import { uploadToB2, deleteFromB2 } from "../../utils/b2Storage.js";

const router = express.Router();

// Get absolute path for uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "seller",
  "uploadCOR",
);

// ✅ Ensure upload folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitize filename
    const fileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    cb(null, `${Date.now()}-${fileName}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});

const profileUploadDir = path.join(
  __dirname,
  "..",
  "..",
  "uploads",
  "seller",
  "uploadProfile",
);
if (!fs.existsSync(profileUploadDir))
  fs.mkdirSync(profileUploadDir, { recursive: true });
const profileUpload = multer({
  storage: multer.diskStorage({
    destination: profileUploadDir,
    filename: (req, file, cb) =>
      cb(
        null,
        `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      ),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith("image/")),
});

// Register route
router.post("/register", upload.single("cor"), (req, res) => {
  const {
    first_name,
    middle_name,
    last_name,
    birthdate,
    email,
    address,
    phone_number,
    student_number,
    year_level,
    course,
    status,
    password,
  } = req.body;

  if (
    !first_name ||
    !middle_name ||
    !last_name ||
    !birthdate ||
    !email ||
    !address ||
    !phone_number ||
    !student_number ||
    !year_level ||
    !course ||
    !password
  ) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const corPath = req.file ? req.file.filename : null;

  const sql =
    "INSERT INTO student (first_name, middle_name, last_name, birthdate, email, address, phone_number, cor, year_level, course, student_number, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

  db.query(
    sql,
    [
      first_name,
      middle_name,
      last_name,
      birthdate,
      email,
      address,
      phone_number,
      corPath,
      year_level,
      course,
      student_number,
      hashedPassword,
    ],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ message: "Email or student number already exists" });
        }
        console.error("Database error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      const studentId = result.insertId;
      const registeredDate = new Date();

      const accSql = `
        INSERT INTO accregistration (student_id, registered_date, register_status)
        VALUES (?, ?, 'pending')
      `;

      db.query(accSql, [studentId, registeredDate], (accErr) => {
        if (accErr) {
          console.error("AccRegistration DB error:", accErr);
          return res
            .status(500)
            .json({ message: "Database error recording registration" });
        }

        res.status(201).json({ message: "User registered successfully" });
      });
    },
  );
});

// Login route
router.post("/login", (req, res) => {
  const { student_number, password } = req.body;

  if (!student_number || !password) {
    return res
      .status(400)
      .json({ message: "Student number and password are required" });
  }

  const sql = `
    SELECT 
      s.student_id, 
      s.first_name, 
      s.middle_name, 
      s.last_name, 
      s.birthdate, 
      s.email, 
      s.address, 
      s.phone_number, 
      s.cor, 
      s.year_level, 
      s.course, 
      s.student_number, 
      s.profile_image,
      s.password, 
      a.register_status,
      a.registered_date,
      a.approved_date,
      COALESCE(x.is_banned, FALSE) AS is_banned
    FROM student s
    LEFT JOIN accregistration a ON s.student_id = a.student_id
    LEFT JOIN account_access x ON x.role = 'seller' AND x.account_id = s.student_id
    WHERE s.student_number = ?`;

  // defensive: remove any accidental trailing comma before FROM to avoid SQL syntax errors
  const normalizedSql = sql.replace(/,\s*FROM/gi, " FROM");

  db.query(normalizedSql, [student_number], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (result.length === 0) {
      logAudit({
        action: "LOGIN",
        actor: student_number,
        role: "Student",
        status: "FAILED",
        information: "Invalid student number",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result[0];
    if (user.is_banned) {
      return res.status(403).json({ message: "Seller account is banned." });
    }
    const isMatch = bcrypt.compareSync(password, user.password);

    if (!isMatch) {
      logAudit({
        action: "LOGIN",
        actor: student_number,
        role: "Student",
        status: "FAILED",
        information: "Invalid password",
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.student_id,
        student_id: user.student_id,
        student_number: user.student_number,
      },
      process.env.JWT_SECRET,
      { expiresIn: "10d" },
    );

    logAudit({
      action: "LOGIN",
      actor: user.student_number,
      role: "Student",
      status: "SUCCESS",
      information: "Student logged in",
    });
    res.json({
      token,
      student_id: user.student_id,
      first_name: user.first_name,
      middle_name: user.middle_name,
      last_name: user.last_name,
      birthdate: user.birthdate,
      email: user.email,
      address: user.address,
      phone_number: user.phone_number,
      profile_image: user.profile_image,
      cor: user.cor,
      year_level: user.year_level,
      student_number: user.student_number,
      course: user.course,
      register_status: user.register_status,
      registered_date: user.registered_date,
      approved_date: user.approved_date,
    });
  });
});

router.get("/me", authenticateSeller, (req, res) => {
  db.query(
    "SELECT student_id, student_number, first_name, middle_name, last_name, birthdate, email, address, phone_number, year_level, course, profile_image FROM student WHERE student_id = ?",
    [req.user.student_id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Database error" });
      if (!result.length)
        return res.status(404).json({ message: "Seller not found" });
      res.json(result[0]);
    },
  );
});

// VERIFY PASSWORD
router.post("/verify-password", authenticateSeller, async (req, res) => {
  const { password } = req.body;
  const actor = req.user?.student_number || req.user?.student_id || "Unknown";

  if (!password) {
    await logAudit({
      action: "VERIFY_PASSWORD",
      actor,
      role: "Student",
      status: "FAILED",
      information: "Password verification attempted without a password value.",
    }).catch((auditError) =>
      console.error(
        "Unable to record password verification audit:",
        auditError.message,
      ),
    );
    return res.status(400).json({ message: "Password is required" });
  }

  db.query(
    "SELECT password FROM student WHERE student_id = ?",
    [req.user.student_id],
    async (err, result) => {
      if (err) {
        console.error("Database error:", err);
        await logAudit({
          action: "VERIFY_PASSWORD",
          actor,
          role: "Student",
          status: "FAILED",
          information: "Database error while verifying seller password.",
        }).catch((auditError) =>
          console.error(
            "Unable to record verification audit:",
            auditError.message,
          ),
        );
        return res.status(500).json({ message: "Database error" });
      }

      if (!result.length) {
        await logAudit({
          action: "VERIFY_PASSWORD",
          actor,
          role: "Student",
          status: "FAILED",
          information: "Seller account not found during password verification.",
        }).catch((auditError) =>
          console.error(
            "Unable to record verification audit:",
            auditError.message,
          ),
        );
        return res.status(404).json({ message: "User not found" });
      }

      const user = result[0];
      const isMatch = bcrypt.compareSync(password, user.password);

      if (!isMatch) {
        await logAudit({
          action: "VERIFY_PASSWORD",
          actor,
          role: "Student",
          status: "FAILED",
          information:
            "Incorrect password entered during seller settings confirmation.",
        }).catch((auditError) =>
          console.error(
            "Unable to record verification audit:",
            auditError.message,
          ),
        );
        return res.status(401).json({ message: "Password is incorrect" });
      }

      await logAudit({
        action: "VERIFY_PASSWORD",
        actor,
        role: "Student",
        status: "SUCCESS",
        information:
          "Seller password confirmed successfully for account changes.",
      }).catch((auditError) =>
        console.error(
          "Unable to record verification audit:",
          auditError.message,
        ),
      );

      res.json({ message: "Password verified successfully" });
    },
  );
});

router.put(
  "/me",
  authenticateSeller,
  profileUpload.single("profile_image"),
  async (req, res) => {
    const actor =
      req.user?.student_number ||
      req.user?.student_id ||
      "Unknown";

    const studentId =
      req.user?.student_id;

    const temporaryProfilePath =
      req.file
        ? path.join(
            profileUploadDir,
            req.file.filename,
          )
        : null;

    let newB2Key = null;

    try {
      /*
       * Get the existing profile image first.
       * We need this so we can remove the old
       * B2 image after the database update succeeds.
       */
      const currentStudent =
        await new Promise(
          (resolve, reject) => {
            db.query(
              `SELECT profile_image
               FROM student
               WHERE student_id = ?
               LIMIT 1`,
              [studentId],
              (error, rows) => {
                if (error) {
                  reject(error);
                  return;
                }

                resolve(
                  rows?.[0] || null,
                );
              },
            );
          },
        );

      if (!currentStudent) {
        if (
          temporaryProfilePath &&
          fs.existsSync(
            temporaryProfilePath,
          )
        ) {
          fs.unlinkSync(
            temporaryProfilePath,
          );
        }

        return res.status(404).json({
          message:
            "Seller not found.",
        });
      }

      /*
       * Upload the new profile image
       * to B2 before changing the database.
       */
      if (req.file) {
        newB2Key =
          `app-uploads/seller/uploadProfile/${req.file.filename}`;

        try {
          await uploadToB2({
            key: newB2Key,

            body:
              fs.readFileSync(
                temporaryProfilePath,
              ),

            contentType:
              req.file.mimetype ||
              "application/octet-stream",
          });

          console.log(
            "Seller profile uploaded to B2:",
            newB2Key,
          );
        } catch (b2Error) {
          console.error(
            "Seller profile B2 upload failed:",
            b2Error.message,
          );

          if (
            temporaryProfilePath &&
            fs.existsSync(
              temporaryProfilePath,
            )
          ) {
            fs.unlinkSync(
              temporaryProfilePath,
            );
          }

          await logAudit({
            action:
              "UPDATE_ACCOUNT_INFORMATION",
            actor,
            role: "Student",
            status: "FAILED",
            information:
              "Seller profile image could not be uploaded to cloud storage.",
          }).catch(() => {});

          return res.status(502).json({
            message:
              "Profile image could not be uploaded to cloud storage.",
          });
        }
      }

      const fields = [
        "student_number",
        "first_name",
        "middle_name",
        "last_name",
        "birthdate",
        "email",
        "address",
        "phone_number",
        "year_level",
        "course",
      ];

      const updates =
        fields.filter((field) =>
          Object.hasOwn(
            req.body,
            field,
          ),
        );

      const values =
        updates.map(
          (field) =>
            req.body[field],
        );

      if (req.file) {
        updates.push(
          "profile_image",
        );

        values.push(
          req.file.filename,
        );
      }

      if (req.body.password) {
        updates.push(
          "password",
        );

        values.push(
          bcrypt.hashSync(
            req.body.password,
            10,
          ),
        );
      }

      if (!updates.length) {
        await logAudit({
          action:
            "UPDATE_ACCOUNT_INFORMATION",
          actor,
          role: "Student",
          status: "FAILED",
          information:
            "No profile changes supplied for seller account update.",
        }).catch(
          (auditError) =>
            console.error(
              "Unable to record update audit:",
              auditError.message,
            ),
        );

        return res.status(400).json({
          message:
            "No profile changes supplied.",
        });
      }

      /*
       * Update MySQL only after the
       * new cloud image is available.
       */
      await new Promise(
        (resolve, reject) => {
          db.query(
            `UPDATE student
             SET ${updates
               .map(
                 (field) =>
                   `${field} = ?`,
               )
               .join(", ")}
             WHERE student_id = ?`,
            [
              ...values,
              studentId,
            ],
            (error, result) => {
              if (error) {
                reject(error);
                return;
              }

              resolve(result);
            },
          );
        },
      );

      /*
       * Database now points to the new
       * image, so the old B2 image can
       * safely be deleted.
       */
      if (
        req.file &&
        currentStudent.profile_image &&
        currentStudent.profile_image !==
          req.file.filename
      ) {
        const oldB2Key =
          `app-uploads/seller/uploadProfile/${currentStudent.profile_image}`;

        try {
          await deleteFromB2(
            oldB2Key,
          );

          console.log(
            "Old seller profile deleted from B2:",
            oldB2Key,
          );
        } catch (
          deleteError
        ) {
          console.warn(
            "Could not delete old seller profile from B2:",
            deleteError.message,
          );
        }

        /*
         * Clean an old local copy too,
         * if one still exists.
         */
        const oldLocalPath =
          path.join(
            profileUploadDir,
            currentStudent.profile_image,
          );

        if (
          fs.existsSync(
            oldLocalPath,
          )
        ) {
          fs.unlinkSync(
            oldLocalPath,
          );
        }
      }

      /*
       * New image was only temporarily
       * stored locally for multer.
       */
      if (
        temporaryProfilePath &&
        fs.existsSync(
          temporaryProfilePath,
        )
      ) {
        fs.unlinkSync(
          temporaryProfilePath,
        );
      }

      await logAudit({
        action:
          "UPDATE_ACCOUNT_INFORMATION",
        actor,
        role: "Student",
        status: "SUCCESS",
        information:
          "Seller account information updated successfully from settings.",
      }).catch(
        (auditError) =>
          console.error(
            "Unable to record update audit:",
            auditError.message,
          ),
      );

      return res.json({
        message:
          "Seller profile updated successfully.",

        profile_image:
          req.file?.filename,
      });
    } catch (error) {
      console.error(
        "Seller profile update error:",
        error,
      );

      /*
       * If B2 upload succeeded but the
       * database update failed, clean up
       * the newly uploaded B2 file.
       */
      if (newB2Key) {
        try {
          await deleteFromB2(
            newB2Key,
          );
        } catch (
          cleanupError
        ) {
          console.warn(
            "Unable to clean failed B2 profile upload:",
            cleanupError.message,
          );
        }
      }

      if (
        temporaryProfilePath &&
        fs.existsSync(
          temporaryProfilePath,
        )
      ) {
        fs.unlinkSync(
          temporaryProfilePath,
        );
      }

      await logAudit({
        action:
          "UPDATE_ACCOUNT_INFORMATION",
        actor,
        role: "Student",
        status: "FAILED",
        information:
          `Seller account update failed: ${
            error.code ===
            "ER_DUP_ENTRY"
              ? "Student number or email already exists."
              : error.message ||
                "Database error"
          }`,
      }).catch(
        (auditError) =>
          console.error(
            "Unable to record update audit:",
            auditError.message,
          ),
      );

      if (
        error.code ===
        "ER_DUP_ENTRY"
      ) {
        return res
          .status(409)
          .json({
            message:
              "Student number or email already exists.",
          });
      }

      return res
        .status(500)
        .json({
          message:
            "Unable to update seller profile.",
        });
    }
  },
);

router.put("/change-password", authenticateSeller, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const studentId = req.user?.student_id;
  const actor = req.user?.student_number || req.user?.student_id || "Unknown";

  if (!studentId || !currentPassword || !newPassword) {
    await logAudit({
      action: "CHANGE_PASSWORD",
      actor,
      role: "Student",
      status: "FAILED",
      information:
        "Seller password change was attempted without current or new password values.",
    }).catch((auditError) =>
      console.error(
        "Unable to record password change audit:",
        auditError.message,
      ),
    );
    return res.status(400).json({
      message: "Current password and new password are required.",
    });
  }

  if (newPassword.length < 8) {
    await logAudit({
      action: "CHANGE_PASSWORD",
      actor,
      role: "Student",
      status: "FAILED",
      information:
        "Seller password change failed: new password is shorter than 8 characters.",
    }).catch((auditError) =>
      console.error(
        "Unable to record password change audit:",
        auditError.message,
      ),
    );
    return res.status(400).json({
      message: "New password must be at least 8 characters long.",
    });
  }

  try {
    const user = await new Promise((resolve, reject) => {
      db.query(
        "SELECT password FROM student WHERE student_id = ?",
        [studentId],
        (error, results) => {
          if (error) return reject(error);
          resolve(results[0]);
        },
      );
    });

    if (!user) {
      await logAudit({
        action: "CHANGE_PASSWORD",
        actor,
        role: "Student",
        status: "FAILED",
        information: "Seller password change failed: account not found.",
      }).catch((auditError) =>
        console.error(
          "Unable to record password change audit:",
          auditError.message,
        ),
      );
      return res.status(404).json({ message: "Seller account not found." });
    }

    const currentPasswordMatches = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!currentPasswordMatches) {
      await logAudit({
        action: "CHANGE_PASSWORD",
        actor,
        role: "Student",
        status: "FAILED",
        information:
          "Seller password change failed: current password was incorrect.",
      }).catch((auditError) =>
        console.error(
          "Unable to record password change audit:",
          auditError.message,
        ),
      );
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    if (currentPassword === newPassword) {
      await logAudit({
        action: "CHANGE_PASSWORD",
        actor,
        role: "Student",
        status: "FAILED",
        information:
          "Seller password change failed: new password matched current password.",
      }).catch((auditError) =>
        console.error(
          "Unable to record password change audit:",
          auditError.message,
        ),
      );
      return res.status(400).json({
        message: "New password must be different from the current password.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await new Promise((resolve, reject) => {
      db.query(
        "UPDATE student SET password = ? WHERE student_id = ?",
        [hashedPassword, studentId],
        (error) => (error ? reject(error) : resolve()),
      );
    });

    await logAudit({
      action: "CHANGE_PASSWORD",
      actor,
      role: "Student",
      status: "SUCCESS",
      information: "Seller password changed successfully from settings.",
    }).catch((auditError) =>
      console.error(
        "Unable to record password change audit:",
        auditError.message,
      ),
    );

    res.json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Error changing seller password:", error);
    await logAudit({
      action: "CHANGE_PASSWORD",
      actor,
      role: "Student",
      status: "FAILED",
      information: `Seller password change failed: ${error.message || "Unexpected error"}`,
    }).catch((auditError) =>
      console.error(
        "Unable to record password change audit:",
        auditError.message,
      ),
    );
    res.status(500).json({ message: "Unable to change password." });
  }
});

router.post("/logout", authenticateSeller, async (req, res) => {
  try {
    await logAudit({
      action: "LOGOUT",
      actor: req.user.student_number || req.user.student_id,
      role: "Student",
      status: "SUCCESS",
      information: "Student logged out",
    });
    res.json({ message: "Logout recorded" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Unable to record logout", error: error.message });
  }
});

export default router;
