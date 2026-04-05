import chokidar, { FSWatcher } from "chokidar";
import sheu from "./sheu";
import { getStatus } from ".";
import { TsxStrictConfig, WatchOptions } from "./config";

let fileWatcher: FSWatcher | null = null;

export function setupFileWatcher(
  restartTsx: () => void,
  config: Partial<TsxStrictConfig> = {}
) {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }

  const watchOptions =
    typeof config.watch === "object"
      ? config.watch
      : ({} as Partial<WatchOptions>);

  fileWatcher = chokidar.watch(watchOptions.include ?? [process.cwd()], {
    ignored: [/node_modules/, /.build/, /dist/, ...(watchOptions.ignore ?? [])],
    ignoreInitial: true,
    persistent: true,
  });

  let isRestarting = false;

  fileWatcher.on("all", (event, path) => {
    if (
      event === "ready" ||
      isRestarting ||
      (!(watchOptions.extensions
        ? new RegExp(`\\.(${watchOptions.extensions.join("|")})$`).test(path)
        : /\.(ts|js|jsx|tsx|mts|cts|mjs|cjs)$/.test(path)) &&
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
          console.log("");
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
