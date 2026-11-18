import db from "./db.js";

export const defaultProgramContent = {
  architecture: {
    title: "BS Architecture",
    eyebrow: "CAFA Program",
    subtitle: "Spaces that give ideas a place to live.",
    description:
      "Explore architectural studies, models, and visual experiments shaped by students who think carefully about people, place, and possibility.",
    image:
      "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1200&q=85",
    focus: ["Spatial storytelling", "Material studies", "Urban futures"],
    stat: "32+",
    statLabel: "studio projects",
  },
  "interior-design": {
    title: "BS Interior Design",
    eyebrow: "CAFA Program",
    subtitle: "Objects, rooms, and moods in conversation.",
    description:
      "Meet the makers exploring how light, texture, furniture, and human movement can transform an interior into an experience.",
    image:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85",
    focus: ["Furniture studies", "Light and atmosphere", "Human-centered spaces"],
    stat: "24+",
    statLabel: "design studies",
  },
  "fine-arts": {
    title: "BFA Painting",
    eyebrow: "CAFA Program",
    subtitle: "A direct line from studio practice to collection.",
    description:
      "Discover paintings, sculpture, printmaking, and mixed media works from artists developing their own visual language inside the academy.",
    image:
      "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=1200&q=85",
    focus: ["Painting and color", "Sculptural form", "Experimental media"],
    stat: "86+",
    statLabel: "original works",
  },
  "visual-communication": {
    title: "BFA Visual Communication",
    eyebrow: "CAFA Program",
    subtitle: "Ideas made visible, compelling, and clear.",
    description:
      "Explore visual communication, campaign concepts, and creative work shaped by students turning ideas into memorable messages.",
    image:
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1200&q=85",
    focus: ["Visual communication", "Campaign concepts", "Creative direction"],
    stat: "18+",
    statLabel: "creative projects",
  },
};

const legacyTitleBySlug = {
  architecture: new Set(["Bachelor of Science in Architecture"]),
  "interior-design": new Set(["Bachelor of Science in Interior Design"]),
  "fine-arts": new Set([
    "Bachelor of Fine Arts in Painting",
    "Bachelor of Fine Arts, Major in Painting",
  ]),
  "visual-communication": new Set([
    "Bachelor of Fine Arts in Visual Communication",
    "Bachelor of Fine Arts, Major in Visual Communication",
  ]),
};

const normalizeProgramContent = (content) => {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return defaultProgramContent;
  }
  return Object.fromEntries(
    Object.entries(defaultProgramContent).map(([slug, fallback]) => {
      const entry = content[slug];
      if (!entry || typeof entry !== "object") {
        return [slug, fallback];
      }
      const legacyTitles = legacyTitleBySlug[slug];
      if (legacyTitles?.has(String(entry.title || "").trim())) {
        return [slug, { ...fallback, ...entry, title: fallback.title }];
      }
      return [slug, { ...fallback, ...entry }];
    }),
  );
};

export function ensureProgramContentTable() {
  return new Promise((resolve, reject) => {
    db.query(
      `CREATE TABLE IF NOT EXISTS program_page_content (
        content_id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
        content_json LONGTEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      (error) => {
        if (error) return reject(error);
        db.query(
          "INSERT IGNORE INTO program_page_content (content_id, content_json) VALUES (1, ?)",
          [JSON.stringify(defaultProgramContent)],
          (seedError) => (seedError ? reject(seedError) : resolve()),
        );
      },
    );
  });
}

export function getProgramContent() {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT content_json FROM program_page_content WHERE content_id = 1",
      (error, rows) => {
        if (error) return reject(error);
        if (!rows.length) {
          return reject(new Error("Program page content has not been initialized."));
        }
        try {
          resolve(normalizeProgramContent(JSON.parse(rows[0].content_json)));
        } catch (parseError) {
          reject(new Error(`Unable to parse saved Program page content: ${parseError.message}`));
        }
      },
    );
  });
}

export function saveProgramContent(content) {
  return new Promise((resolve, reject) => {
    db.query(
      "UPDATE program_page_content SET content_json = ? WHERE content_id = 1",
      [JSON.stringify(content)],
      (error) => (error ? reject(error) : resolve()),
    );
  });
}
