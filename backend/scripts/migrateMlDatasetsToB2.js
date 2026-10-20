import fs from "fs";
import path from "path";

import {
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

import {
  b2Client,
  uploadToB2,
} from "../utils/b2Storage.js";

const DATASET_ROOT =
  path.resolve(
    "ml",
    "datasets",
  );

const B2_PREFIX =
  "ml-datasets";

const MAX_RETRIES = 6;

/*
 * Small delay between successful
 * uploads so we do not hammer B2.
 */
const UPLOAD_DELAY_MS = 150;

const sleep = (ms) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms),
  );

const getContentType = (
  fileName,
) => {
  const ext =
    path
      .extname(fileName)
      .toLowerCase();

  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";

    case ".png":
      return "image/png";

    case ".webp":
      return "image/webp";

    case ".gif":
      return "image/gif";

    case ".bmp":
      return "image/bmp";

    default:
      return "application/octet-stream";
  }
};

const collectFiles =
  async (folder) => {
    const entries =
      await fs.promises.readdir(
        folder,
        {
          withFileTypes: true,
        },
      );

    const files = [];

    for (
      const entry
      of entries
    ) {
      const absolutePath =
        path.join(
          folder,
          entry.name,
        );

      if (
        entry.isDirectory()
      ) {
        files.push(
          ...await collectFiles(
            absolutePath,
          ),
        );

        continue;
      }

      if (
        !entry.isFile()
      ) {
        continue;
      }

      if (
        entry.name ===
          ".DS_Store" ||
        entry.name ===
          "Thumbs.db"
      ) {
        continue;
      }

      files.push(
        absolutePath,
      );
    }

    return files;
  };

const makeB2Key = (
  absolutePath,
) => {
  const relativePath =
    path.relative(
      DATASET_ROOT,
      absolutePath,
    );

  const normalized =
    relativePath
      .split(path.sep)
      .join("/");

  return `${B2_PREFIX}/${normalized}`;
};

/*
 * Read the existing B2 dataset objects
 * in batches of up to 1000.
 *
 * This is much better than calling
 * HeadObject once for every single file.
 */
const getExistingB2Keys =
  async () => {
    const existing =
      new Set();

    let continuationToken =
      undefined;

    do {
      const response =
        await b2Client.send(
          new ListObjectsV2Command({
            Bucket:
              process.env.B2_BUCKET,

            Prefix:
              `${B2_PREFIX}/`,

            ContinuationToken:
              continuationToken,

            MaxKeys: 1000,
          }),
        );

      for (
        const object
        of response.Contents || []
      ) {
        if (object.Key) {
          existing.add(
            object.Key,
          );
        }
      }

      continuationToken =
        response.IsTruncated
          ? response
              .NextContinuationToken
          : undefined;
    } while (
      continuationToken
    );

    return existing;
  };

const getErrorStatus = (
  error,
) =>
  error?.$metadata
    ?.httpStatusCode ||
  null;

const isRetryableError = (
  error,
) => {
  const status =
    getErrorStatus(error);

  if (
    [
      408,
      429,
      500,
      502,
      503,
      504,
    ].includes(status)
  ) {
    return true;
  }

  const name =
    String(
      error?.name || "",
    );

  if (
    [
      "TimeoutError",
      "NetworkingError",
      "RequestTimeout",
      "ECONNRESET",
    ].includes(name)
  ) {
    return true;
  }

  /*
   * Backblaze/AWS SDK can sometimes
   * surface transient S3 errors as
   * UnknownError.
   *
   * Only retry it if it is not a 4xx
   * client error.
   */
  if (
    name ===
    "UnknownError" &&
    (
      !status ||
      status >= 500
    )
  ) {
    return true;
  }

  return false;
};

const uploadWithRetry =
  async (
    absolutePath,
    key,
  ) => {
    /*
     * Use a Buffer rather than a stream
     * because the same data may need
     * to be sent again during retries.
     */
    const body =
      await fs.promises.readFile(
        absolutePath,
      );

    for (
      let attempt = 1;
      attempt <= MAX_RETRIES;
      attempt += 1
    ) {
      try {
        await uploadToB2({
          key,
          body,

          contentType:
            getContentType(
              absolutePath,
            ),
        });

        return;
      } catch (error) {
        const status =
          getErrorStatus(
            error,
          );

        console.error(
          `  Attempt ${attempt}/${MAX_RETRIES} failed`,
        );

        console.error(
          "  HTTP status:",
          status || "unknown",
        );

        console.error(
          "  Error name:",
          error?.name ||
            "unknown",
        );

        console.error(
          "  Error message:",
          error?.message ||
            "unknown",
        );

        /*
         * 403 usually means permissions,
         * account/cap problem, etc.
         * Retrying immediately will not help.
         */
        if (status === 403) {
          throw error;
        }

        if (
          !isRetryableError(
            error,
          ) ||
          attempt ===
            MAX_RETRIES
        ) {
          throw error;
        }

        const waitMs =
          Math.min(
            1000 *
              2 **
                (
                  attempt -
                  1
                ),
            30000,
          );

        console.log(
          `  Waiting ${waitMs / 1000}s before retry...`,
        );

        await sleep(
          waitMs,
        );
      }
    }
  };

const migrate =
  async () => {
    if (
      !fs.existsSync(
        DATASET_ROOT,
      )
    ) {
      console.error(
        "Dataset folder not found:",
        DATASET_ROOT,
      );

      process.exit(1);
    }

    const files =
      await collectFiles(
        DATASET_ROOT,
      );

    console.log(
      `Found ${files.length} local dataset file(s).`,
    );

    console.log(
      "Checking what is already in B2...",
    );

    let existingKeys;

    try {
      existingKeys =
        await getExistingB2Keys();
    } catch (error) {
      console.error(
        "Could not list existing B2 dataset files.",
      );

      console.error(
        "HTTP status:",
        getErrorStatus(error) ||
          "unknown",
      );

      console.error(
        "Error name:",
        error?.name ||
          "unknown",
      );

      console.error(
        "Error message:",
        error?.message ||
          "unknown",
      );

      process.exit(1);
    }

    console.log(
      `Found ${existingKeys.size} existing B2 dataset object(s).`,
    );

    console.log("");

    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    for (
      let index = 0;
      index < files.length;
      index += 1
    ) {
      const absolutePath =
        files[index];

      const key =
        makeB2Key(
          absolutePath,
        );

      if (
        existingKeys.has(
          key,
        )
      ) {
        skipped += 1;

        console.log(
          `[${index + 1}/${files.length}] SKIP: ${key}`,
        );

        continue;
      }

      console.log(
        `[${index + 1}/${files.length}] UPLOAD: ${key}`,
      );

      try {
        await uploadWithRetry(
          absolutePath,
          key,
        );

        uploaded += 1;

        existingKeys.add(
          key,
        );

        await sleep(
          UPLOAD_DELAY_MS,
        );
      } catch (error) {
        failed += 1;

        const status =
          getErrorStatus(
            error,
          );

        console.error(
          `FAILED: ${key}`,
        );

        console.error(
          "HTTP status:",
          status || "unknown",
        );

        console.error(
          "Error name:",
          error?.name ||
            "unknown",
        );

        console.error(
          "Error message:",
          error?.message ||
            "unknown",
        );

        /*
         * Stop immediately on 403.
         *
         * This may mean the account has
         * hit a transaction cap or there
         * is a permission/account issue.
         */
        if (status === 403) {
          console.error("");
          console.error(
            "STOPPING: B2 returned HTTP 403.",
          );

          console.error(
            "Check Backblaze Caps & Alerts and the application key before retrying.",
          );

          break;
        }
      }
    }

    console.log("");
    console.log(
      "Migration finished.",
    );

    console.log(
      `Uploaded this run: ${uploaded}`,
    );

    console.log(
      `Already in B2: ${skipped}`,
    );

    console.log(
      `Failed this run: ${failed}`,
    );

    console.log("");
    console.log(
      "Local dataset files were NOT deleted.",
    );
  };

migrate().catch(
  (error) => {
    console.error(
      "Dataset migration failed:",
      error,
    );

    process.exit(1);
  },
);