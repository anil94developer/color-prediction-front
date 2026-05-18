/**
 * Render static sites sometimes have an empty Build Command in the dashboard.
 * When RENDER=true, run the Vite build after npm install so ./dist exists for publish.
 */
import { execSync } from "node:child_process";

const onRender = process.env.RENDER === "true";
const explicit = process.env.RENDER_AUTO_BUILD === "1";

if (!onRender && !explicit) {
  process.exit(0);
}

console.log("[render-build] Running vite build for static publish…");
execSync("npm run build", { stdio: "inherit" });
