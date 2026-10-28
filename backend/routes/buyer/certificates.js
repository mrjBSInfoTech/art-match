import express from "express";
import { authenticateBuyer } from "../../middleware/buyerAuthMiddleware.js";
import { CertificateError, getBuyerCertificate, getPublicCertificate, getBuyerCertificateIdentity } from "../../utils/certificates.js";
import rateLimit from "express-rate-limit";

const router = express.Router();
router.get("/verify/:token", rateLimit({ windowMs: 60_000, limit: 60 }), async (req, res) => {
  res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" });
  try { return res.json(await getPublicCertificate(req.params.token)); }
  catch (error) {
    if (error instanceof CertificateError) return res.status(error.status).json({ message: error.message });
    console.error("Public certificate error:", error.code || error.name);
    return res.status(500).json({ message: "Unable to verify certificate." });
  }
});
router.use(authenticateBuyer);

router.get("/order-items/:orderItemId/verification", async (req, res) => {
  if (req.user.student_id || req.user.student_number || req.user.admin_id) return res.sendStatus(403);
  res.set("Cache-Control", "no-store");
  try { return res.json(await getBuyerCertificateIdentity(req.user.customer_id || req.user.id, req.params.orderItemId)); }
  catch (error) { return res.status(error instanceof CertificateError ? error.status : 500).json({ message: error instanceof CertificateError ? error.message : "Unable to load certificate." }); }
});

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
