import "dotenv/config";
import { DIGITAL_SELLER_PROFILES } from "./seeders/digitalCatalog.js";
import { parseSeedCliArgs, runCatalogSeeder } from "./seeders/sellerCatalogSeeder.js";

async function main() {
  const options = parseSeedCliArgs();
  await runCatalogSeeder(DIGITAL_SELLER_PROFILES, options);
}

main().catch((error) => {
  console.error("Digital seller seeder failed:", error.message);
  process.exitCode = 1;
});
