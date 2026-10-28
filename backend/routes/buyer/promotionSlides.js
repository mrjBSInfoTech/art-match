import express from "express";
import { listPromotionSlides } from "../../database/promotionSlides.js";
import {
  getPromotionHeader,
  getPromotionHeroEnabled,
} from "../../database/systemSettings.js";

const router = express.Router();
const imagePrefix = "app-uploads/admin/promotion-slides/";

router.get("/header", async (_req, res) => {
  try {
    return res.json(await getPromotionHeader());
  } catch (error) {
    console.error("Unable to load buyer promotion header:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load promotion header." });
  }
});

router.get("/settings", async (_req, res) => {
  try {
    const enabled = await getPromotionHeroEnabled();
    return res.json({ hero_enabled: enabled });
  } catch (error) {
    console.error("Unable to load buyer promotion slide placement:", error.code || error.name);
    return res.status(500).json({ message: "Unable to load promotion slide placement." });
  }
});

router.get("/", async (_req, res) => {
  try {
    const slides = await listPromotionSlides({ publishedOnly: true });
    res.json(
      slides.map((slide) => {
        const filename = slide.image_key?.startsWith(imagePrefix)
          ? slide.image_key.slice(imagePrefix.length)
          : null;
        return {
          slide_id: slide.slide_id,
          title: slide.title,
          description: slide.description,
          button_label: slide.button_label,
          button_url: slide.button_url,
          sort_order: slide.sort_order,
          image_url: filename
            ? `/uploads/admin/promotion-slides/${encodeURIComponent(filename)}`
            : null,
        };
      }),
    );
  } catch (error) {
    console.error("Unable to load buyer promotion slides:", error.code || error.name);
    res.status(500).json({ message: "Unable to load promotion slides." });
  }
});

export default router;
