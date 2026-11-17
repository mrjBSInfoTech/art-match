import "dotenv/config";
import { SCULPTURE_SELLER_PROFILES } from "./seeders/sculpturesCatalog.js";
import { parseSeedCliArgs, runCatalogSeeder } from "./seeders/sellerCatalogSeeder.js";

async function main() {
  const options = parseSeedCliArgs(process.argv.slice(2), { offset: 6 });
  await runCatalogSeeder(SCULPTURE_SELLER_PROFILES, options);
}

main().catch((error) => {
  console.error("Sculpture seller seeder failed:", error.message);
  process.exitCode = 1;
});
