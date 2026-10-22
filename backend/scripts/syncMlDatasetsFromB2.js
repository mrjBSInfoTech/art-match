import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { ML_DATASETS, syncMlDatasets } from "../utils/mlDatasetSync.js";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function argumentsFor(argv) {
  const options = { dataset: "all", concurrency: 4, localSeed: true, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--help" || flag === "-h") options.help = true;
    else if (flag === "--json") options.json = true;
    else if (flag === "--no-local-seed") options.localSeed = false;
    else if (["--dataset", "--destination", "--concurrency"].includes(flag)) {
      const value = argv[++index];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
      options[flag.slice(2)] = flag === "--concurrency" ? Number(value) : value;
    } else throw new Error(`Unknown argument: ${flag}`);
  }
  if (options.dataset !== "all" && !ML_DATASETS.includes(options.dataset)) {
    throw new Error(`--dataset must be all, ${ML_DATASETS.join(", ")}`);
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 8) {
    throw new Error("--concurrency must be an integer between 1 and 8");
  }
  return options;
}

async function main() {
  const options = argumentsFor(process.argv.slice(2));
  if (options.help) {
    console.log(`Download verified ML training datasets from B2 into a local cache.

Usage: node backend/scripts/syncMlDatasetsFromB2.js [options]

  --dataset <name>      all (default), features, mediums_2d, or mediums_3d
  --destination <path>  Cache root (default ML_DATASET_DIR or backend/.cache/ml-datasets)
  --no-local-seed       Download instead of copying matching backend/ml/datasets files
  --concurrency <1-8>   Concurrent files (default 4)
  --json               Final JSON summary on stdout; progress on stderr
  --help               Show help without credentials or network access

Existing cache files are verified by size and MD5. Extra files and originals are preserved.
Unexpected files inside a selected dataset stop the sync; use a fresh --destination.
Relative destination paths are resolved against the backend directory.
The cache contains features/, mediums_2d/, and mediums_3d/ subdirectories.`);
    return;
  }
  // Load the absolute backend .env before importing b2Storage, regardless of cwd.
  dotenv.config({ path: path.join(backendRoot, ".env"), quiet: true });
  process.env.DOTENV_CONFIG_QUIET = "true";
  const { b2Client } = await import("../utils/b2Storage.js");
  try {
    const destination = path.resolve(backendRoot, options.destination || process.env.ML_DATASET_DIR || path.join(backendRoot, ".cache", "ml-datasets"));
    let lastProgress = 0;
    const summary = await syncMlDatasets({
      client: b2Client,
      bucket: process.env.B2_BUCKET,
      destination,
      seedRoot: options.localSeed ? path.join(backendRoot, "ml", "datasets") : null,
      dataset: options.dataset,
      concurrency: options.concurrency,
      onProgress(progress) {
        const completed = progress.skipped + progress.seeded + progress.downloaded;
        if (completed === progress.files || Date.now() - lastProgress >= 2000) {
          process.stderr.write(`Datasets: ${completed}/${progress.files} files (${progress.skipped} cached, ${progress.seeded} copied, ${progress.downloaded} downloaded)\n`);
          lastProgress = Date.now();
        }
      },
    });
    if (options.json) console.log(JSON.stringify(summary));
    else console.log(`Datasets ready: ${summary.files} verified files in ${summary.root}\n${summary.skipped} cached, ${summary.seeded} copied, ${summary.downloaded} downloaded.`);
  } finally {
    b2Client.destroy();
  }
}

main().catch((error) => {
  const nestedCodes = [...new Set((error.errors || []).map((item) => item.code).filter(Boolean))];
  const detail = error.message || [error.name || "Error", error.code, ...nestedCodes].filter(Boolean).join(": ");
  process.stderr.write(`Dataset sync failed: ${detail}\n`);
  if (process.argv.includes("--json")) console.log(JSON.stringify({ ...error.summary, complete: false, error: detail }));
  process.exitCode = 1;
});
