import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env
dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

// Import the existing backend database connection
const { default: db } = await import("../../database/db.js");

const DATA_DIR = path.join(__dirname, "data");

const SASREC_FILE = path.join(
  DATA_DIR,
  "ArtMatch.txt",
);

const USER_MAP_FILE = path.join(
  DATA_DIR,
  "user_mapping.json",
);

const ITEM_MAP_FILE = path.join(
  DATA_DIR,
  "item_mapping.json",
);

const PREF_FILE = path.join(
  DATA_DIR,
  "preference_events.jsonl",
);

const SUMMARY_FILE = path.join(
  DATA_DIR,
  "export_summary.json",
);

// These are the events that will become
// the artwork sequence used by SASRec.
const POSITIVE_ITEM_EVENTS = new Set([
  "view",
  "favorite",
  "cart",
  "purchase",
]);

// These are saved separately.
// They will be used later for reranking.
const PREFERENCE_EVENTS = new Set([
  "search",
  "filter",
]);

// Decide whether this interaction belongs
// to a logged-in customer or a guest session.
const identityForRow = (row) => {
  if (
    row.customer_id !== null &&
    row.customer_id !== undefined
  ) {
    return `customer:${Number(
      row.customer_id,
    )}`;
  }

  const sessionId = String(
    row.session_id || "",
  ).trim();

  if (sessionId) {
    return `guest:${sessionId}`;
  }

  return null;
};

// Safely close MySQL when finished.
const closeDatabase = async () => {
  if (typeof db.end !== "function") {
    return;
  }

  await new Promise((resolve) => {
    db.end(() => resolve());
  });
};

try {
  // Create:
  // backend/ml/recommendation/data/
  fs.mkdirSync(DATA_DIR, {
    recursive: true,
  });

  // Read interactions chronologically.
  const [rows] = await db.promise().query(`
    SELECT
      interaction_id,
      customer_id,
      session_id,
      artwork_id,
      event_type,
      search_query,
      filter_type,
      filter_value,
      min_price,
      max_price,
      source_page,
      created_at
    FROM recommendation_interaction
    ORDER BY
      created_at ASC,
      interaction_id ASC
  `);

  // Store one artwork sequence per identity.
  const sequences = new Map();

  // Search/filter events are kept separately.
  const preferenceRows = [];

  let positiveRowsSeen = 0;
  let ignoredRemovalRows = 0;
  let invalidRows = 0;

  for (const row of rows) {
    const identity =
      identityForRow(row);

    if (!identity) {
      invalidRows += 1;
      continue;
    }

    const eventType = String(
      row.event_type || "",
    )
      .trim()
      .toLowerCase();

    // -------------------------------------
    // SEARCH / FILTER
    // -------------------------------------
    if (
      PREFERENCE_EVENTS.has(
        eventType,
      )
    ) {
      preferenceRows.push({
        interaction_id: Number(
          row.interaction_id,
        ),

        identity,

        customer_id:
          row.customer_id === null
            ? null
            : Number(
                row.customer_id,
              ),

        session_id:
          row.session_id || null,

        event_type:
          eventType,

        search_query:
          row.search_query || null,

        filter_type:
          row.filter_type || null,

        filter_value:
          row.filter_value || null,

        min_price:
          row.min_price === null
            ? null
            : Number(
                row.min_price,
              ),

        max_price:
          row.max_price === null
            ? null
            : Number(
                row.max_price,
              ),

        source_page:
          row.source_page || null,

        created_at:
          row.created_at,
      });

      continue;
    }

    // -------------------------------------
    // IGNORE NEGATIVE / REMOVAL EVENTS
    // -------------------------------------
    if (
      !POSITIVE_ITEM_EVENTS.has(
        eventType,
      )
    ) {
      // Examples:
      // unfavorite
      // remove_cart
      ignoredRemovalRows += 1;
      continue;
    }

    // -------------------------------------
    // POSITIVE ARTWORK EVENT
    // -------------------------------------
    const artworkId = Number(
      row.artwork_id,
    );

    if (
      !Number.isInteger(
        artworkId,
      ) ||
      artworkId <= 0
    ) {
      invalidRows += 1;
      continue;
    }

    positiveRowsSeen += 1;

    // Create sequence if this is
    // the first event for this identity.
    if (
      !sequences.has(identity)
    ) {
      sequences.set(identity, {
        firstInteractionId:
          Number(
            row.interaction_id,
          ),

        customer_id:
          row.customer_id === null
            ? null
            : Number(
                row.customer_id,
              ),

        session_id:
          row.session_id || null,

        rawArtworkIds: [],
      });
    }

    const sequence =
      sequences.get(identity);

    const items =
      sequence.rawArtworkIds;

    /*
     * Collapse only ADJACENT duplicates.
     *
     * Example:
     *
     * view 28
     * favorite 28
     * cart 28
     * purchase 28
     *
     * becomes:
     *
     * 28
     *
     * But this:
     *
     * view 28
     * view 31
     * favorite 28
     *
     * remains:
     *
     * 28 -> 31 -> 28
     *
     * This prevents one artwork from being
     * over-represented just because the user
     * performed several actions on it.
     */
    if (
      items.length === 0 ||
      items[
        items.length - 1
      ] !== artworkId
    ) {
      items.push(
        artworkId,
      );
    }
  }

  /*
   * Keep only sequences with at least
   * 2 artwork interactions.
   *
   * A one-item sequence is not useful
   * for next-item sequence learning.
   */
  const eligibleSequences = [
    ...sequences.entries(),
  ]
    .filter(
      ([, data]) =>
        data.rawArtworkIds
          .length >= 2,
    )
    .sort(
      (a, b) =>
        a[1]
          .firstInteractionId -
        b[1]
          .firstInteractionId,
    );

  // Keep information about users
  // that currently have too little history.
  const excludedShortSequences = [
    ...sequences.entries(),
  ]
    .filter(
      ([, data]) =>
        data.rawArtworkIds
          .length < 2,
    )
    .map(
      ([identity, data]) => ({
        identity,

        sequence_length:
          data.rawArtworkIds
            .length,

        raw_artwork_ids:
          data.rawArtworkIds,
      }),
    );

  // -------------------------------------
  // USER MAPPING
  // -------------------------------------
  const userRawToSasrec = {};
  const userSasrecToRaw = {};

  eligibleSequences.forEach(
    ([identity], index) => {
      // SASRec IDs start at 1.
      const sasrecUserId =
        index + 1;

      userRawToSasrec[
        identity
      ] = sasrecUserId;

      userSasrecToRaw[
        String(
          sasrecUserId,
        )
      ] = identity;
    },
  );

  // -------------------------------------
  // ITEM / ARTWORK MAPPING
  // -------------------------------------
  const itemRawToSasrec = {};
  const itemSasrecToRaw = {};

  let nextItemId = 1;

  for (
    const [, data]
    of eligibleSequences
  ) {
    for (
      const rawArtworkId
      of data.rawArtworkIds
    ) {
      const key = String(
        rawArtworkId,
      );

      if (
        !Object.hasOwn(
          itemRawToSasrec,
          key,
        )
      ) {
        itemRawToSasrec[
          key
        ] = nextItemId;

        itemSasrecToRaw[
          String(nextItemId)
        ] = rawArtworkId;

        nextItemId += 1;
      }
    }
  }

  // -------------------------------------
  // BUILD SASRec .txt FILE
  // -------------------------------------
  const outputLines = [];

  for (
    const [
      identity,
      data,
    ] of eligibleSequences
  ) {
    const sasrecUserId =
      userRawToSasrec[
        identity
      ];

    for (
      const rawArtworkId
      of data.rawArtworkIds
    ) {
      const sasrecItemId =
        itemRawToSasrec[
          String(
            rawArtworkId,
          )
        ];

      outputLines.push(
        `${sasrecUserId} ${sasrecItemId}`,
      );
    }
  }

  // Example output:
  //
  // 1 1
  // 1 2
  // 1 3
  // 2 2
  // 2 4
  //
  fs.writeFileSync(
    SASREC_FILE,

    outputLines.length
      ? `${outputLines.join(
          "\n",
        )}\n`
      : "",

    "utf8",
  );

  // -------------------------------------
  // SAVE USER MAPPING
  // -------------------------------------
  fs.writeFileSync(
    USER_MAP_FILE,

    JSON.stringify(
      {
        raw_to_sasrec:
          userRawToSasrec,

        sasrec_to_raw:
          userSasrecToRaw,
      },

      null,
      2,
    ),

    "utf8",
  );

  // -------------------------------------
  // SAVE ARTWORK MAPPING
  // -------------------------------------
  fs.writeFileSync(
    ITEM_MAP_FILE,

    JSON.stringify(
      {
        raw_to_sasrec:
          itemRawToSasrec,

        sasrec_to_raw:
          itemSasrecToRaw,
      },

      null,
      2,
    ),

    "utf8",
  );

  // -------------------------------------
  // SAVE SEARCH / FILTER EVENTS
  // -------------------------------------
  fs.writeFileSync(
    PREF_FILE,

    preferenceRows
      .map(
        (row) =>
          JSON.stringify(
            row,
          ),
      )
      .join("\n") +
      (
        preferenceRows.length
          ? "\n"
          : ""
      ),

    "utf8",
  );

  // -------------------------------------
  // EXPORT SUMMARY
  // -------------------------------------
  const sequenceLengths =
    eligibleSequences.map(
      ([, data]) =>
        data.rawArtworkIds
          .length,
    );

  const summary = {
    exported_at:
      new Date()
        .toISOString(),

    total_database_rows:
      rows.length,

    positive_item_rows_seen:
      positiveRowsSeen,

    search_filter_rows_exported_separately:
      preferenceRows.length,

    ignored_non_positive_item_rows:
      ignoredRemovalRows,

    invalid_rows_ignored:
      invalidRows,

    sasrec_users:
      eligibleSequences.length,

    sasrec_items:
      Object.keys(
        itemRawToSasrec,
      ).length,

    sasrec_interaction_lines:
      outputLines.length,

    users_with_at_least_4_items:
      sequenceLengths.filter(
        (length) =>
          length >= 4,
      ).length,

    excluded_users_with_less_than_2_items:
      excludedShortSequences.length,

    excluded_short_sequences:
      excludedShortSequences,
  };

  fs.writeFileSync(
    SUMMARY_FILE,

    JSON.stringify(
      summary,
      null,
      2,
    ),

    "utf8",
  );

  // -------------------------------------
  // TERMINAL OUTPUT
  // -------------------------------------
  console.log("");
  console.log(
    "SASRec export complete.",
  );

  console.log(
    "------------------------------------",
  );

  console.log(
    `Database rows read:        ${rows.length}`,
  );

  console.log(
    `SASRec users:              ${summary.sasrec_users}`,
  );

  console.log(
    `SASRec items:              ${summary.sasrec_items}`,
  );

  console.log(
    `SASRec interaction lines:  ${summary.sasrec_interaction_lines}`,
  );

  console.log(
    `Users eligible for eval:   ${summary.users_with_at_least_4_items}`,
  );

  console.log(
    `Short users excluded:      ${summary.excluded_users_with_less_than_2_items}`,
  );

  console.log("");

  console.log(
    `Created: ${SASREC_FILE}`,
  );

  console.log(
    `Created: ${USER_MAP_FILE}`,
  );

  console.log(
    `Created: ${ITEM_MAP_FILE}`,
  );

  console.log(
    `Created: ${PREF_FILE}`,
  );

  console.log(
    `Created: ${SUMMARY_FILE}`,
  );

  console.log("");

  // -------------------------------------
  // WARNINGS
  // -------------------------------------
  if (
    eligibleSequences.length === 0
  ) {
    console.warn(
      "WARNING: No identity currently has at least 2 sequential artwork interactions.",
    );

    console.warn(
      "Collect more view/favorite/cart/purchase history before training SASRec.",
    );
  } else if (
    summary.users_with_at_least_4_items ===
    0
  ) {
    console.warn(
      "NOTE: Training data exists, but no user currently has 4+ sequence items.",
    );

    console.warn(
      "The current SASRec split will not yet have meaningful validation/test users.",
    );
  }
} catch (error) {
  console.error(
    "Unable to export SASRec data:",
    error,
  );

  process.exitCode = 1;
} finally {
  await closeDatabase()
    .catch(() => {});
}