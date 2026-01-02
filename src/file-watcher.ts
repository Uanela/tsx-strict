import chokidar, { FSWatcher } from "chokidar";
import sheu from "./sheu";

let fileWatcher: FSWatcher | null = null;

export function setupFileWatcher(restartTsx: () => Promise<void>) {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }

  fileWatcher = chokidar.watch(
    ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.mjs", "**/*.cjs"],
    {
      ignored: [/node_modules/, /(^|[\/\\])\../, /.json/],
      ignoreInitial: true,
      persistent: true,
      cwd: process.cwd(),
    }
  );

  let isRestarting = false;
  fileWatcher.on("all", async (event, path) => {
    if (event === "ready" || isRestarting) return;
    isRestarting = true;

    path = path.replace(process.cwd(), "");
    path = path.startsWith("/")
      ? path.replace("/", "")
      : path.startsWith("\\")
        ? path.replace("\\", "")
        : path;

    sheu.info(`Restarting because of file changes: ${path}`, {
      timestamp: true,
    });
    await restartTsx?.();
    isRestarting = false;
  });
}

export function stopFileWatcher() {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
}
