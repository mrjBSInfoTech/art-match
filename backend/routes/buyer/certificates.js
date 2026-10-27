import express from "express";
import { authenticateBuyer } from "../../middleware/buyerAuthMiddleware.js";
import { CertificateError, getBuyerCertificate } from "../../utils/certificates.js";

const router = express.Router();
router.use(authenticateBuyer);

router.get("/order-items/:orderItemId", async (req, res) => {
  if (req.user.student_id || req.user.student_number || req.user.admin_id) {
    return res.status(403).json({ message: "Buyer access is required." });
  }
  res.set({
    "Cache-Control": "private, no-store",
    "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; sandbox",
    "X-Content-Type-Options": "nosniff",
  });
  try {
    const svg = await getBuyerCertificate(req.user.customer_id || req.user.id, req.params.orderItemId);
    res.set({
      "Content-Disposition": "inline; filename=\"certificate-of-authenticity.svg\"",
    });
    return res.type("image/svg+xml").send(svg);
  } catch (error) {
    if (error instanceof CertificateError) return res.status(error.status).json({ message: error.message });
    console.error("Buyer certificate error:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load this certificate." });
  }
});

export default router;
