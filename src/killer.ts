import psTree from "ps-tree";
import spawn from "cross-spawn";
import { ChildProcess, exec } from "child_process";
import { getTsxKiller, setTsxKiller } from ".";

let KILL_SIGNAL = "15"; // SIGTERM
let hasPS = true;

const isWindows = process.platform === "win32";

// discover if the OS has `ps`, and therefore can use psTree
exec("ps", function (error) {
  if (error) {
    hasPS = false;
  }
});

export function kill(child: ChildProcess): Promise<void> {
  return new Promise<void>((resolve) => {
    if (!child.pid) {
      resolve();
      return;
    }

    if (isWindows) {
      exec(`taskkill /pid ${child.pid} /T /F`, () => resolve());
    } else {
      if (hasPS) {
        psTree(child.pid, (_, kids) => {
          const kidsPIDs = kids.map((p) => p.PID);
          const args = [`-${KILL_SIGNAL}`, child.pid!.toString(), ...kidsPIDs];
          spawn("kill", args).on("close", resolve);
        });
      } else {
        exec(`kill -${KILL_SIGNAL} ${child.pid}`, () => resolve());
      }
    }
  });
}

let runningKillProcessesPromise: Promise<number> | null = null;

export async function killProcesses(
  currentCompilationId: number
): Promise<number> {
  if (runningKillProcessesPromise)
    return runningKillProcessesPromise.then(() => currentCompilationId);

  const promisesToWaitFor: Promise<any>[] = [];

  const tsxKiller = getTsxKiller();
  if (tsxKiller) {
    promisesToWaitFor.push(tsxKiller());
    setTsxKiller(null);
  }

  runningKillProcessesPromise = Promise.all(promisesToWaitFor)
    .then(() => {
      runningKillProcessesPromise = null;
      return currentCompilationId;
    })
    .catch((error) => {
      console.error("Error killing processes:", error);
      runningKillProcessesPromise = null;
      return currentCompilationId;
    });

  return runningKillProcessesPromise;
}
