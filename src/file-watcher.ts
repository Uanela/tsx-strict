import chokidar, { FSWatcher } from "chokidar";
import sheu from "./sheu";

let fileWatcher: FSWatcher | null = null;

export function setupFileWatcher(restartTsx: () => void) {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }

  fileWatcher = chokidar.watch([process.cwd()], {
    ignored: [/node_modules/, /(^|[\/\\])\../, /.json/],
    ignoreInitial: true,
    persistent: true,
  });

  fileWatcher.on("all", (event, path) => {
    if (event === "ready" || !/\.(ts|tsx|js|jsx)$/.test(path)) return;
    path = path.replace(process.cwd(), "");
    path = path.startsWith("/")
      ? path.replace("/", "")
      : path.startsWith("\\")
        ? path.replace("\\", "")
        : path;

    sheu.info(`Restarting because of file changes: ${path}`, {
      timestamp: true,
    });
    restartTsx?.();
  });
}

export function stopFileWatcher() {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
}
