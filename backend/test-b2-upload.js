import dotenv from "dotenv";

dotenv.config();

const {
  uploadToB2,
} = await import(
  "./utils/b2Storage.js"
);

try {
  const result =
    await uploadToB2({
      key:
        "test/artmatch-test.txt",

      body:
        "Hello from ArtMatch!",

      contentType:
        "text/plain",
    });

  console.log(
    "B2 upload successful:",
    result,
  );
} catch (error) {
  console.error(
    "B2 upload failed:",
    error,
  );
}