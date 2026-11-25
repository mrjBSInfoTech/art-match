import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import db from "../database/db.js";
import { logAudit } from "./auditLogger.js";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.resolve(__dirname, "..");
const EXPORT_SCRIPT = path.join(BACKEND_DIR, "ml", "recommendation", "export_sasrec_data.js");
const TRAIN_SCRIPT = path.join(BACKEND_DIR, "ml", "recommendation", "train_sasrec.py");

export const AUTO_RETRAIN_THRESHOLD = Math.max(
  1,
  Number(process.env.SASREC_RETRAIN_THRESHOLD) || 250,
);
const CHECK_COOLDOWN_MS = 60_000;
const LAST_TRAINED_ID_KEY = "sasrec_last_trained_interaction_id";
const LAST_TRAINED_AT_KEY = "sasrec_last_trained_at";

let retrainInProgress = false;
let lastCheckTimestamp = 0;

function resolvePythonExecutable() {
  const configured = String(process.env.PYTHON_BINARY || "").trim();
  if (configured) return configured;

  const candidates = [
    path.join(BACKEND_DIR, "ml", ".venv", "Scripts", "python.exe"),
    path.join(BACKEND_DIR, "ml", ".venv", "bin", "python"),
    path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe"),
    path.join(BACKEND_DIR, ".venv", "bin", "python"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return "python";
}

async function getLastTrainedInteractionId(pool) {
  try {
    const [rows] = await pool.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1",
      [LAST_TRAINED_ID_KEY],
    );
    const parsed = Number(rows?.[0]?.setting_value || 0);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

async function saveRetrainCheckpoint(pool, maxInteractionId) {
  const nowIso = new Date().toISOString();
  await pool.query(
    `INSERT INTO system_settings (setting_key, setting_value)
     VALUES (?, ?), (?, ?)
     ON DUPLICATE KEY UPDATE
       setting_value = VALUES(setting_value),
       updated_at = CURRENT_TIMESTAMP`,
    [LAST_TRAINED_ID_KEY, String(maxInteractionId), LAST_TRAINED_AT_KEY, nowIso],
  );
}

async function notifyMlServiceReload() {
  const recommendUrl =
    String(process.env.ML_RECOMMEND_URL || "http://127.0.0.1:8000/recommend").trim();
  const reloadUrl = recommendUrl.replace(/\/recommend\/?$/i, "/recommend/reload");
  try {
    const response = await fetch(reloadUrl, {
      method: "POST",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Checks whether at least AUTO_RETRAIN_THRESHOLD (default: 250) new interaction
 * rows have been recorded since the last SASRec training run. Runs non-blocking
 * in the background and hot-reloads the FastAPI model on completion.
 */
export async function checkAndTriggerSasrecRetrain({ force = false } = {}) {
  if (process.env.SASREC_AUTO_RETRAIN === "0") {
    return { triggered: false, reason: "disabled" };
  }
  if (retrainInProgress) {
    return { triggered: false, reason: "already_running" };
  }

  const now = Date.now();
  if (!force && now - lastCheckTimestamp < CHECK_COOLDOWN_MS) {
    return { triggered: false, reason: "cooldown" };
  }
  lastCheckTimestamp = now;

  const pool = db.promise();
  try {
    const lastTrainedId = await getLastTrainedInteractionId(pool);
    const [countRows] = await pool.query(
      `SELECT
         COUNT(*) AS new_interactions,
         COALESCE(MAX(interaction_id), 0) AS max_interaction_id
       FROM recommendation_interaction
       WHERE interaction_id > ?`,
      [lastTrainedId],
    );

    const newCount = Number(countRows?.[0]?.new_interactions || 0);
    const maxId = Number(countRows?.[0]?.max_interaction_id || 0);

    if (!force && newCount < AUTO_RETRAIN_THRESHOLD) {
      return {
        triggered: false,
        reason: "below_threshold",
        newInteractions: newCount,
        threshold: AUTO_RETRAIN_THRESHOLD,
      };
    }

    retrainInProgress = true;
    try {
      await execFileAsync(process.execPath, [EXPORT_SCRIPT], {
        cwd: BACKEND_DIR,
        timeout: 120_000,
      });

      const pythonBin = resolvePythonExecutable();
      await execFileAsync(pythonBin, [TRAIN_SCRIPT], {
        cwd: BACKEND_DIR,
        timeout: 300_000,
      });

      await saveRetrainCheckpoint(pool, maxId);
      const reloaded = await notifyMlServiceReload();

      await logAudit({
        action: "SASREC_AUTO_RETRAINED",
        actor: "System",
        role: "System",
        status: "SUCCESS",
        information: `Auto-retrained SASRec after ${newCount} new interactions (up to interaction_id ${maxId}). ML reload: ${reloaded ? "ok" : "deferred"}.`,
      }).catch(() => {});

      return {
        triggered: true,
        newInteractions: newCount,
        maxInteractionId: maxId,
        reloaded,
      };
    } finally {
      retrainInProgress = false;
    }
  } catch (error) {
    console.warn("SASRec auto-retrain check failed:", error?.message || error);
    return { triggered: false, reason: "error", error: error?.message || String(error) };
  }
}

export function scheduleSasrecAutoRetrainCheck() {
  if (process.env.SASREC_AUTO_RETRAIN === "0" || retrainInProgress) return;
  const now = Date.now();
  if (now - lastCheckTimestamp < CHECK_COOLDOWN_MS) return;

  setImmediate(() => {
    void checkAndTriggerSasrecRetrain();
  });
}
