import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";

function run(command, options = {}) {
  execSync(command, {
    stdio: "inherit",
    ...options,
  });
}

run("pnpm --filter @workspace/api-server run build");

run("pnpm --filter @workspace/unisphere run build", {
  env: {
    ...process.env,
    PORT: "5173",
    BASE_PATH: "/",
  },
});

rmSync("public", { recursive: true, force: true });
mkdirSync("public", { recursive: true });
cpSync("artifacts/unisphere/dist/public", "public", { recursive: true });
