import db from "./database/db.js";

const queries = [
  "SHOW TABLES LIKE 'chat_public_keys'",
  "SHOW COLUMNS FROM message WHERE Field IN ('sender_public_key', 'encryption_iv', 'attachment_iv', 'media_type')",
];

const run = (index) => {
  if (index >= queries.length) {
    db.end();
    return;
  }
  db.query(queries[index], (error, rows) => {
    if (error) {
      console.error(error.message);
      process.exitCode = 1;
    } else {
      console.log(JSON.stringify(rows, null, 2));
    }
    run(index + 1);
  });
};

run(0);
