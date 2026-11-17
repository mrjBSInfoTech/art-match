import "dotenv/config";
import { PAINTING_SELLER_PROFILES } from "./seeders/paintingsCatalog.js";
import { parseSeedCliArgs, runCatalogSeeder } from "./seeders/sellerCatalogSeeder.js";

async function main() {
  const options = parseSeedCliArgs(process.argv.slice(2), { offset: 3 });
  await runCatalogSeeder(PAINTING_SELLER_PROFILES, options);
}

main().catch((error) => {
  console.error("Painting seller seeder failed:", error.message);
  process.exitCode = 1;
});
