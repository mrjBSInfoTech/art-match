import db from "./db.js";

const query = async (sql, params = []) => {
  const [rows] = await db.promise().query(sql, params);
  return rows;
};

export const defaultFaqs = [
  {
    question: "How do I know an artwork is authentic?",
    answer:
      "Every listing is reviewed before it is published, and each purchase comes with a certificate of authenticity issued by the studio.",
  },
  {
    question: "How long does delivery take?",
    answer:
      "Most artworks are packed and shipped within 3-5 business days. Delivery usually takes 3-7 business days within the country and 7-14 business days internationally.",
  },
  {
    question: "Which payment methods are accepted?",
    answer:
      "Secure checkout accepts major credit and debit cards, e-wallets, and other supported online payment channels.",
  },
  {
    question: "Can I return an artwork?",
    answer:
      "Returns are accepted for damaged or incorrectly described artworks. Report the issue with photos within the return window stated in the policy so the support team can help.",
  },
];

export const ensureFaqTable = async () => {
  await query(
    `CREATE TABLE IF NOT EXISTS faq_entries (
      faq_id INT AUTO_INCREMENT PRIMARY KEY,
      question VARCHAR(255) NOT NULL,
      answer TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
    )`,
  );

  const [{ entry_count: entryCount }] = await query(
    "SELECT COUNT(*) AS entry_count FROM faq_entries",
  );
  if (Number(entryCount) === 0) {
    for (const [index, faq] of defaultFaqs.entries()) {
      await query(
        "INSERT INTO faq_entries (question, answer, sort_order) VALUES (?, ?, ?)",
        [faq.question, faq.answer, index + 1],
      );
    }
  }
};

export const listFaqs = async () =>
  query(
    "SELECT faq_id, question, answer, sort_order FROM faq_entries ORDER BY sort_order, faq_id",
  );

export const replaceFaqs = async (faqs) => {
  const connection = await db.promise().getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM faq_entries");
    for (const [index, faq] of faqs.entries()) {
      await connection.query(
        "INSERT INTO faq_entries (question, answer, sort_order) VALUES (?, ?, ?)",
        [faq.question, faq.answer, index + 1],
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return listFaqs();
};
