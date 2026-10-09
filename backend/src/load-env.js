import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(backendRoot, ".env");
const result = dotenv.config({ path: envPath });

if (result.error && result.error.code !== "ENOENT") {
  throw new Error(`Could not load backend environment from ${envPath}: ${result.error.message}`);
}
