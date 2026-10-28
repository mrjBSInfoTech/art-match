import express from "express";
import { listFaqs } from "../../database/faq.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const faqs = await listFaqs();
    return res.json(
      faqs.map(({ faq_id, question, answer }) => ({ faq_id, question, answer })),
    );
  } catch (error) {
    console.error("Unable to load FAQs for buyers:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load FAQs." });
  }
});

export default router;
