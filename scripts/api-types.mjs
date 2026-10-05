// Generates src/api/generated/schema.ts from the backend's OpenAPI document.
// Usage: npm run api:types   (backend must be running; API_ORIGIN defaults to http://localhost:4000)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function readEnvLocal() {
  if (!existsSync(".env.local")) return {};
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]),
  );
}

const origin = (process.env.API_ORIGIN ?? readEnvLocal().API_ORIGIN ?? "http://localhost:4000").replace(/\/+$/, "");
const source = `${origin}/api/docs.json`;
const output = "src/api/generated/schema.ts";

console.log(`openapi-typescript ${source} → ${output}`);
execFileSync(process.execPath, ["node_modules/openapi-typescript/bin/cli.js", source, "-o", output], {
  stdio: "inherit",
});
