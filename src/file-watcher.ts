import chokidar, { FSWatcher } from "chokidar";
import sheu from "./sheu";

let fileWatcher: FSWatcher | null = null;

export function setupFileWatcher(restartTsx: () => Promise<void>) {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }

  fileWatcher = chokidar.watch([process.cwd()], {
    ignored: (path) => {
      if (/[/\\]node_modules[/\\]/.test(path)) return true;
      if (/\.json$/.test(path)) return true;
      if (/\.env(\.|$)/.test(path)) return false;
      return !/\.(ts|js|jsx|tsx|mts|cts|mjs|cjs)$/.test(path);
    },
    ignoreInitial: true,
    persistent: true,
  });

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

    setTimeout(() => {
      isRestarting = false;
    }, 800);
    await restartTsx?.();
  });
}

export function stopFileWatcher() {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
}
