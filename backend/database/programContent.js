import db from "./db.js";

export const defaultProgramContent = {
  architecture: {
    title: "Architecture",
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
    title: "Interior Design",
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
    title: "Fine Arts",
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
          resolve(JSON.parse(rows[0].content_json));
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
