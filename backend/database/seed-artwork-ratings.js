import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { ensureArtworkReviewSchema } from "./reviews.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

const GENERAL_COMMENTS = [
  "Beautiful craftsmanship and thoughtful composition. Really glad I discovered this artist on ArtMatch.",
  "The attention to detail immediately stands out. You can tell a lot of care went into creating this piece.",
  "Stunning work! The colors and balance feel expressive and polished.",
  "Impressive execution from a talented student artist. Truly gallery-worthy.",
  "Love the mood and visual storytelling in this piece. Exceeded my expectations.",
  "Very clean work with a distinct personal style. Definitely worth supporting!",
  "The finish and overall presentation are remarkable. Highly recommend this artist.",
  "Eye-catching and full of character. It instantly stood out while browsing the catalog.",
  "Wonderful technique and creative direction. Looking forward to seeing more works like this.",
  "Such a well-crafted piece! The details hold up nicely even on a closer look.",
  "Thoughtful design and great artistic sensibility. A genuinely inspiring piece.",
  "Rich visual appeal and strong execution throughout. Really happy to support this creator.",
  "Crisp, expressive, and carefully finished. Easily one of my favorites in the collection.",
  "Great balance of creativity and technical skill. The artist clearly put heart into this work.",
  "Lovely piece with memorable details and great visual harmony.",
  "Superb quality and originality. Proud to see talent like this showcased here.",
  "Captivating aesthetic and cohesive tones. It has real presence and charm.",
  "Really admire the creativity and precision here. Would gladly recommend to other collectors.",
  "Polished, expressive, and thoughtfully composed. An awesome addition to the marketplace.",
  "Fantastic artwork! Strong concept and clean execution from start to finish.",
  "Every time I look at this piece I notice another thoughtful detail. Truly well done.",
  "The visual impact is immediate and memorable. Such impressive student artistry!",
  "Wonderful use of contrast and form. This piece feels heartfelt and original.",
  "Clean, refined, and full of personality. I'm really glad this is featured on ArtMatch.",
  "You can feel the passion and dedication behind this work. Great job to the artist!",
  "Really tasteful color choices and strong composition. Easily deserves high praise.",
  "A refreshing and creative piece that brings real character to the collection.",
  "Beautifully balanced from edge to edge. It's inspiring to see work of this caliber.",
  "Thoughtfully made with a very pleasing finish. Would love to see future pieces from this creator.",
  "Genuinely charming work—expressive, well-proportioned, and visually engaging.",
  "Admirable skill and artistic maturity. This stands out right away on the page.",
  "Super impressive quality and originality. Supporting artists like this makes browsing worthwhile.",
  "Love the warmth and artistic voice conveyed here. Really nicely executed!",
  "Strong creative vision paired with neat, confident craftsmanship.",
  "Delightful work with great visual flow and memorable artistry.",
];

const CATEGORY_COMMENTS = {
  painting: [
    "Gorgeous brushwork and color harmony. The textures bring the whole painting to life.",
    "The lighting and palette choices in this painting are truly captivating.",
    "Expressive strokes and wonderful depth—this painting has real warmth and presence.",
    "Beautifully layered tones and confident composition. A standout painting in the gallery.",
    "The color blending and atmosphere in this painting are really impressive.",
    "Such vibrant energy and thoughtful composition on canvas. Wonderful painting!",
    "Love the subtle shading and mood captured in this piece. Very skilled painter.",
    "Remarkable sense of light and movement. This painting immediately drew my attention.",
    "Rich pigments and expressive detail throughout. Truly a lovely original painting.",
    "The brushwork feels both delicate and bold—an admirable piece of fine art.",
  ],
  digital: [
    "Super crisp rendering and awesome lighting! The digital details look phenomenal.",
    "Love the clean linework, vibrant palette, and polished digital finish.",
    "Really strong visual storytelling and atmospheric shading in this digital artwork.",
    "Impressive digital illustration with great depth and expressive character.",
    "Sharp, imaginative, and beautifully colored. Easily stands out in the digital catalog.",
    "The lighting effects and composition are top-notch. Awesome digital artistry!",
    "Clean execution and creative styling—this digital work looks professionally done.",
    "Fantastic color grading and intricate details throughout the illustration.",
    "Very polished digital piece with strong mood and clear artistic vision.",
    "Creative concept brought to life with smooth rendering and great contrast.",
  ],
  sculpture: [
    "Incredible form and dimensional detail! You can appreciate the craftsmanship from every angle.",
    "The proportions, texture, and sculptural finish are truly impressive.",
    "Remarkable three-dimensional artistry with a strong sense of balance and presence.",
    "Such careful sculpting and tactile detail. Truly a standout piece of craftsmanship.",
    "Love the organic contours and fine surface work on this sculpture.",
    "Very well-crafted form with thoughtful attention to structure and finish.",
    "Unique sculptural design that feels both expressive and solidly executed.",
    "Beautifully shaped and finished—this piece showcases genuine studio skill.",
    "Great texture and silhouette. A memorable work of sculptural art.",
    "Impressive mastery of form and detail. Wonderful craftsmanship overall.",
  ],
  product: [
    "Creative, functional, and beautifully designed—love how art meets everyday usability here.",
    "Great build quality and charming artistic touches. Makes a wonderful gift or keepsake.",
    "Thoughtfully crafted piece with clean finishing and practical appeal.",
    "Love the originality and care put into this art product. Looks fantastic!",
    "Well-made and visually appealing—definitely stands out from mass-produced items.",
    "Charming design and solid craftsmanship. Very happy to support student-made pieces.",
    "Polished finish and tasteful artistic styling. Great value for handcrafted work.",
    "Super neat design with lovely attention to detail. Would gladly recommend this shop.",
    "Creative craftsmanship that feels personal and well put together.",
    "Attractive, well-finished, and thoughtfully made. Really impressed with this piece.",
  ],
};

function parseCliArgs(argv = process.argv.slice(2)) {
  const options = {
    url: "",
    dryRun: false,
    local: false,
    batchSize: 500,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--local") {
      options.local = true;
    } else if (arg.startsWith("--url=")) {
      options.url = arg.slice("--url=".length).trim();
    } else if (arg === "--url" && argv[i + 1]) {
      options.url = argv[i + 1].trim();
      i += 1;
    } else if (arg.startsWith("--batch-size=")) {
      const parsed = Number(arg.slice("--batch-size=".length));
      if (Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 2000) {
        options.batchSize = parsed;
      }
    } else if (!arg.startsWith("--") && !options.url) {
      options.url = arg.trim();
    }
  }

  return options;
}

function buildConnectionConfigFromUrl(connectionUrl) {
  const parsed = new URL(connectionUrl.trim());
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username || "root"),
    password: decodeURIComponent(parsed.password || ""),
    database: parsed.pathname.replace(/^\//, ""),
    multipleStatements: false,
  };
}

async function resolveDbConnection(options) {
  const envUrl = options.local
    ? ""
    : (process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL || process.env.DATABASE_URL || "").trim();
  const candidateUrl = options.url || envUrl;

  if (candidateUrl.startsWith("mysql://")) {
    const cfg = buildConnectionConfigFromUrl(candidateUrl);
    const connection = await mysql.createConnection(cfg);
    return { connection, target: `${cfg.host}:${cfg.port}/${cfg.database}` };
  }

  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME) {
    const cfg = {
      host: process.env.DB_HOST.trim(),
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER.trim(),
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME.trim(),
    };
    const connection = await mysql.createConnection(cfg);
    return { connection, target: `${cfg.host}:${cfg.port}/${cfg.database}` };
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (
      await rl.question("Paste MYSQL_PUBLIC_URL (mysql://root:...@host:port/railway): ")
    ).trim();
    if (!answer.startsWith("mysql://")) {
      throw new Error("Invalid or missing mysql:// connection URL.");
    }
    const cfg = buildConnectionConfigFromUrl(answer);
    const connection = await mysql.createConnection(cfg);
    return { connection, target: `${cfg.host}:${cfg.port}/${cfg.database}` };
  } finally {
    rl.close();
  }
}

function deterministicHash(a, b) {
  let h = (Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b ^ 0xc2b2ae35, 0x27d4eb2d)) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

function detectCategory(artwork) {
  const combined = `${artwork.art_type || ""} ${artwork.exact_art_type || ""} ${artwork.product || ""} ${artwork.product_type || ""}`.toLowerCase();
  if (combined.includes("product") || combined.includes("merch") || combined.includes("print") || combined.includes("craft")) {
    return "product";
  }
  if (combined.includes("sculpt") || combined.includes("clay") || combined.includes("ceramic") || combined.includes("wood")) {
    return "sculpture";
  }
  if (combined.includes("digital") || combined.includes("illustrat") || combined.includes("graphic") || combined.includes("vector")) {
    return "digital";
  }
  if (combined.includes("paint") || combined.includes("acrylic") || combined.includes("oil") || combined.includes("watercolor") || combined.includes("canvas")) {
    return "painting";
  }
  return "general";
}

function shuffleForArtwork(pool, artworkId) {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = deterministicHash(artworkId, i + 101) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateReviewForPair(artwork, customer, customerIndex, shuffledPool) {
  const h1 = deterministicHash(artwork.artwork_id, customer.customer_id);
  const h2 = deterministicHash(customer.customer_id + 17, artwork.artwork_id + 31);

  // Natural positive rating distribution strictly between 4 and 5 (~70% 5-star, ~30% 4-star)
  const rating = h1 % 10 < 7 ? 5 : 4;

  // Deterministic permutation per artwork guarantees distinct comments across buyers on the same artwork
  let comment = shuffledPool[customerIndex % shuffledPool.length];

  // Occasionally personalize with the artwork title (keeping well under the 600-char max)
  const title = String(artwork.title || "").trim();
  if (title && title.length <= 70 && h2 % 4 === 0) {
    comment = `"${title}" is truly impressive. ${comment}`;
  }
  if (comment.length > 600) {
    comment = comment.slice(0, 597) + "...";
  }

  // Spread timestamps realistically across the past 1 to 30 days
  const offsetSeconds = 3600 + (h1 % (29 * 24 * 3600));
  const createdAt = new Date(Date.now() - offsetSeconds * 1000);

  return { rating, comment, createdAt };
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const { connection, target } = await resolveDbConnection(options);
  const query = async (sql, params = []) => (await connection.query(sql, params))[0];

  try {
    console.log(`Connected to MySQL: ${target}${options.dryRun ? " [DRY RUN]" : ""}`);

    if (!options.dryRun) {
      await ensureArtworkReviewSchema(query);
    }

    // Exact public catalog filter matching GET /api/buyer/artworks and POST /api/buyer/reviews
    const publicArtworks = await query(`
      SELECT
        a.artwork_id,
        a.student_id,
        a.title,
        a.art_type,
        a.exact_art_type,
        a.genre,
        a.product,
        a.product_type
      FROM artwork a
      JOIN student s ON s.student_id = a.student_id
      LEFT JOIN accregistration ac ON ac.student_id = a.student_id
      WHERE (ac.register_status IS NULL OR LOWER(TRIM(ac.register_status)) = 'verified')
        AND EXISTS (
          SELECT 1 FROM artupload au
          WHERE au.artwork_id = a.artwork_id
            AND LOWER(TRIM(au.request_status)) = 'verified'
        )
      ORDER BY a.artwork_id ASC
    `);

    const buyers = await query(`
      SELECT customer_id, username, first_name, last_name
      FROM customer
      ORDER BY customer_id ASC
    `);

    if (!publicArtworks.length) {
      console.log("No publicly posted (verified) artworks found. Nothing to seed.");
      return;
    }
    if (!buyers.length) {
      console.log("No buyer accounts found in customer table. Nothing to seed.");
      return;
    }

    // Check existing reviews so re-running never duplicates (artwork_id, customer_id) pairs
    const existingPairs = new Set();
    try {
      const existingRows = await query(`
        SELECT artwork_id, customer_id
        FROM artwork_reviews
        WHERE artwork_id IS NOT NULL
      `);
      for (const row of existingRows) {
        existingPairs.add(`${row.artwork_id}:${row.customer_id}`);
      }
    } catch (err) {
      if (!options.dryRun || err.code !== "ER_NO_SUCH_TABLE") throw err;
    }

    const rowsToInsert = [];
    let skippedExisting = 0;
    let fiveStarCount = 0;
    let fourStarCount = 0;

    for (const artwork of publicArtworks) {
      const category = detectCategory(artwork);
      const combinedPool = [...(CATEGORY_COMMENTS[category] || []), ...GENERAL_COMMENTS];
      const shuffledPool = shuffleForArtwork(combinedPool, artwork.artwork_id);

      buyers.forEach((buyer, buyerIndex) => {
        const key = `${artwork.artwork_id}:${buyer.customer_id}`;
        if (existingPairs.has(key)) {
          skippedExisting += 1;
          return;
        }
        const { rating, comment, createdAt } = generateReviewForPair(
          artwork,
          buyer,
          buyerIndex,
          shuffledPool,
        );
        if (rating === 5) fiveStarCount += 1;
        else fourStarCount += 1;

        rowsToInsert.push([
          null,
          null,
          buyer.customer_id,
          artwork.student_id,
          artwork.artwork_id,
          rating,
          comment,
          createdAt,
        ]);
      });
    }

    console.log(
      JSON.stringify(
        {
          target,
          dryRun: options.dryRun,
          publicArtworks: publicArtworks.length,
          buyerAccounts: buyers.length,
          expectedTotalPairs: publicArtworks.length * buyers.length,
          alreadyReviewedPairsSkipped: skippedExisting,
          newReviewsToInsert: rowsToInsert.length,
          ratingDistribution: {
            fiveStars: fiveStarCount,
            fourStars: fourStarCount,
          },
          sampleReviews: rowsToInsert.slice(0, 5).map((row) => ({
            artwork_id: row[4],
            customer_id: row[2],
            seller_id: row[3],
            rating: row[5],
            comment: row[6],
          })),
        },
        null,
        2,
      ),
    );

    if (options.dryRun || !rowsToInsert.length) {
      if (!rowsToInsert.length) {
        console.log("All buyer accounts have already rated every public artwork.");
      } else {
        console.log("Dry run complete — no rows were written.");
      }
      return;
    }

    await connection.beginTransaction();
    try {
      for (let i = 0; i < rowsToInsert.length; i += options.batchSize) {
        const batch = rowsToInsert.slice(i, i + options.batchSize);
        await connection.query(
          `INSERT INTO artwork_reviews
            (order_id, order_item_id, customer_id, seller_id, artwork_id, rating, comment, created_at)
           VALUES ?`,
          [batch],
        );
      }
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    }

    const [summaryRow] = await query(`
      SELECT
        COUNT(*) AS total_reviews,
        COUNT(DISTINCT artwork_id) AS rated_artworks,
        COUNT(DISTINCT customer_id) AS reviewing_buyers,
        ROUND(AVG(rating), 2) AS overall_avg_rating,
        MIN(rating) AS min_rating,
        MAX(rating) AS max_rating
      FROM artwork_reviews
      WHERE artwork_id IN (?)
    `, [publicArtworks.map((a) => a.artwork_id)]);

    console.log("\nSeeding complete! Public artwork review summary:");
    console.log(JSON.stringify(summaryRow, null, 2));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Artwork ratings seeder failed:", error.message || error);
  process.exitCode = 1;
});
