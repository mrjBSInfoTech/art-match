import db from "./db.js";

export const defaultAboutContent = {
  collegeName: "College of Architecture and Fine Arts (CAFA)",
  tagline: "Nurturing artistic and creative excellence at the heart of the North.",
  introduction:
    "Welcome to the official online home of the College of Architecture and Fine Arts (CAFA) and the Red Nexus creative community. CAFA is dedicated to developing artists, designers, and architects who use their practice to serve people and communities.",
  vision:
    "CAFA is envisioned to be a center of excellence in architecture, business, arts, science and technology education.",
  mission:
    "To be an nationally renowned, technologically and scientifically trained graduates who will be economically productive, self-sufficient, effective, responsible and productive citizens of the Philippines.",
  goals: [
    "Prepare the students to be professional, scientific, technological, technical and vocational.",
    "Inculcate cultural ideals through research.",
    "Eliminate classroom through application in extension and community service.",
    "Nurture individuals through organized and production.",
  ],
  objectives: [
    "Foster achievement among faculty members by providing the right and adequate competencies through relevant faculty development program and performance evaluation system.",
    "Serve students by creatively learning the curriculum and instruction.",
    "Impart zeal to explore scientific and technological possibilities through research that will subsequently effect improvement in the quality of life.",
    "Involve its environment and community services to help alleviate poverty.",
    "Contribute an atmosphere that will promote high productivity and creativity to continuously improving facilities.",
  ],
  history:
    "The College of Architecture and Fine Arts of the Far Eastern “Naguilian” Institute of Science and Technology developed from the institution's expansion into collegiate education. The college continues to grow as a center for architecture, design, and the visual arts.\n\nThrough dedicated faculty and a practice-based curriculum, CAFA prepares students to respond creatively to the needs of communities while honoring local culture and identity.",
  offerings: [
    { title: "Architecture", description: "Curriculum includes professional studies, theory and practice, and design." },
    { title: "Interior Design", description: "Spatial planning, furniture, lighting, building codes, and environmental interior planning." },
    { title: "Fine Arts Painting", description: "Painting techniques, composition, genres, and contemporary art practices." },
    { title: "Visual Communication", description: "Applied visual media, illustration, graphic design, and digital visual communication." },
  ],
  contacts: [
    { label: "Campus location", value: "Naguilian, San Fernando, La Union 2500" },
    { label: "Official website", value: "cafa.slu.edu.ph" },
    { label: "Contact number", value: "(632) 8743 0378 / (632) 8569 107" },
    { label: "Email address", value: "cafa@slue.edu.ph" },
    { label: "Official social media", value: "facebook.com/cafaofficialslu" },
  ],
};

export function ensureAboutContentTable() {
  return new Promise((resolve, reject) => {
    db.query(
      `CREATE TABLE IF NOT EXISTS about_page_content (
        content_id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
        content_json LONGTEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      (error) => {
        if (error) return reject(error);
        db.query(
          "INSERT IGNORE INTO about_page_content (content_id, content_json) VALUES (1, ?)",
          [JSON.stringify(defaultAboutContent)],
          (seedError) => (seedError ? reject(seedError) : resolve()),
        );
      },
    );
  });
}

export function getAboutContent() {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT content_json FROM about_page_content WHERE content_id = 1",
      (error, rows) => {
        if (error) return reject(error);
        if (!rows.length) {
          return reject(new Error("About page content has not been initialized."));
        }
        try {
          resolve(JSON.parse(rows[0].content_json));
        } catch (parseError) {
          reject(new Error(`Unable to parse saved About page content: ${parseError.message}`));
        }
      },
    );
  });
}

export function saveAboutContent(content) {
  return new Promise((resolve, reject) => {
    db.query(
      "UPDATE about_page_content SET content_json = ? WHERE content_id = 1",
      [JSON.stringify(content)],
      (error) => (error ? reject(error) : resolve()),
    );
  });
}
