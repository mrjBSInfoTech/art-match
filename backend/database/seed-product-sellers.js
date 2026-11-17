import "dotenv/config";
import { PRODUCT_SELLER_PROFILES } from "./seeders/productsCatalog.js";
import { parseSeedCliArgs, runCatalogSeeder } from "./seeders/sellerCatalogSeeder.js";

async function main() {
  const options = parseSeedCliArgs(process.argv.slice(2), { offset: 8 });
  await runCatalogSeeder(PRODUCT_SELLER_PROFILES, options);
}

main().catch((error) => {
  console.error("Product seller seeder failed:", error.message);
  process.exitCode = 1;
});
