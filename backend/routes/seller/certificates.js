import express from "express";
import multer from "multer";
import { authenticateSeller } from "../../middleware/sellerAuthMiddleware.js";
import { getSellerCertificate, publishCertificate, CertificateError } from "../../utils/certificates.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype !== "image/svg+xml") {
      callback(new CertificateError(400, "Certificate must be an SVG file."));
      return;
    }
    callback(null, true);
  },
});

const handleError = (res, error) => {
  if (error instanceof CertificateError) return res.status(error.status).json({ message: error.message });
  if (error instanceof multer.MulterError) return res.status(413).json({ message: "Certificate SVG must be no larger than 12 MB." });
  console.error("Seller certificate error:", error.code || error.name);
  return res.status(500).json({ message: "Unable to process the certificate." });
};

const parseCertificateUpload = (req, res, next) => {
  upload.single("certificate_svg")(req, res, (error) => {
    if (error) return handleError(res, error);
    next();
  });
};

router.use(authenticateSeller);

router.get("/:artworkId", async (req, res) => {
  try {
    const certificate = await getSellerCertificate(req.user.student_id, req.params.artworkId);
    return res.json(certificate || { artworkId: Number(req.params.artworkId), published: false });
  } catch (error) {
    return handleError(res, error);
  }
});

router.post("/", parseCertificateUpload, async (req, res) => {
  try {
    if (!req.file) throw new CertificateError(400, "Certificate SVG is required.");
    const svg = req.file.buffer.toString("utf8");
    const certificate = await publishCertificate(
      req.user.student_id,
      req.body.artwork_id,
      req.body.certificate_id,
      svg,
    );
    return res.status(201).json(certificate);
  } catch (error) {
    return handleError(res, error);
  }
});

export default router;
