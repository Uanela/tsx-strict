import chokidar, { FSWatcher } from "chokidar";
import sheu from "./sheu";
import { getStatus } from ".";

let fileWatcher: FSWatcher | null = null;

export function setupFileWatcher(restartTsx: () => void) {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }

  fileWatcher = chokidar.watch([process.cwd()], {
    ignored: [/node_modules/, /.build/, /dist/],
    ignoreInitial: true,
    persistent: true,
  });

  let isRestarting = false;
  fileWatcher.on("all", (event, path) => {
    if (
      event === "ready" ||
      isRestarting ||
      (!/\.(ts|js|jsx|tsx|mts|cts|mjs|cjs)$/.test(path) &&
        !path.includes(".env"))
    )
      return;
    isRestarting = true;

    path = path.replace(process.cwd(), "");
    path = path.startsWith("/")
      ? path.replace("/", "")
      : path.startsWith("\\")
        ? path.replace("\\", "")
        : path;

    const status = getStatus();

    if (!status?.hasTsErrors)
      sheu.info(`Restarting because of file changes: ${path}`, {
        timestamp: true,
      });
    else
      setTimeout(() => {
        if (status.hasTsErrors) {
          sheu.warn(
            `Waiting for TypeScript errors to be fixed in order to restart`,
            { timestamp: true }
          );
        } else {
          sheu.info(`Restarting because of file changes: ${path}`, {
            timestamp: true,
          });
        }
      }, 500);

    setTimeout(() => {
      isRestarting = false;
    }, 800);
    restartTsx?.();
  });
}

export function stopFileWatcher() {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
}
