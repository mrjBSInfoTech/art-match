import db from "./db.js";

export const defaultFooterContent = {
  brandName: "RED NEXUS",
  description:
    "An e-commerce marketplace powered by the Central Academy of Fine Arts student community. Curating true creative expressions straight from the studio.",
  columns: [
    {
      title: "Acquire Art",
      links: [
        { label: "Paintings", url: "/buyer/shop" },
        { label: "Sculptures", url: "/buyer/shop/Sculpture" },
        { label: "Photography", url: "/buyer/shop/Photography" },
      ],
    },
    {
      title: "Programs",
      links: [
        { label: "Architecture", url: "/buyer/programs/architecture" },
        { label: "Interior Design", url: "/buyer/programs/interior-design" },
        { label: "Fine Arts", url: "/buyer/programs/fine-arts" },
      ],
    },
    {
      title: "Academy",
      links: [
        { label: "About CAFA", url: "/buyer/about" },
        { label: "Exhibitions Calendar", url: "/buyer/academy/exhibitions" },
        { label: "Vocation & Inquiries", url: "/buyer/academy/inquiries" },
        { label: "Support Desk", url: "/buyer/help-support" },
      ],
    },
  ],
  copyright:
    "© {year} CAFArtMart. Powered safely by Central Academy of Fine Arts.",
  socials: [
    { platform: "Twitter", url: "" },
    { platform: "Facebook", url: "" },
    { platform: "Instagram", url: "" },
  ],
};

export function ensureFooterContentTable() {
  return new Promise((resolve, reject) => {
    db.query(
      `CREATE TABLE IF NOT EXISTS footer_content (
        content_id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
        content_json LONGTEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      (error) => {
        if (error) return reject(error);
        db.query(
          "INSERT IGNORE INTO footer_content (content_id, content_json) VALUES (1, ?)",
          [JSON.stringify(defaultFooterContent)],
          (seedError) => (seedError ? reject(seedError) : resolve()),
        );
      },
    );
  });
}

export function getFooterContent() {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT content_json FROM footer_content WHERE content_id = 1",
      (error, rows) => {
        if (error) return reject(error);
        if (!rows.length) {
          return reject(new Error("Footer content has not been initialized."));
        }
        try {
          resolve(JSON.parse(rows[0].content_json));
        } catch (parseError) {
          reject(new Error(`Unable to parse saved footer content: ${parseError.message}`));
        }
      },
    );
  });
}

export function saveFooterContent(content) {
  return new Promise((resolve, reject) => {
    db.query(
      "UPDATE footer_content SET content_json = ? WHERE content_id = 1",
      [JSON.stringify(content)],
      (error) => (error ? reject(error) : resolve()),
    );
  });
}
