#!/usr/bin/env node

import nodeCleanup, { uninstall } from "node-cleanup";
import spawn from "cross-spawn";
import { run } from "./runner";
import { detectState, deleteClear, print } from "./stdout-manipulator";
import { createInterface } from "readline";
import { killProcesses } from "./killer";
import { getCompilerPath } from "./compiler-provider";

let firstTime = true;
export let tsxKiller: (() => Promise<void>) | null = null;

export function setTsxKiller(value: typeof tsxKiller) {
  tsxKiller = value;
}

export function getTsxKiller() {
  return tsxKiller;
}

export async function runTsxStrict(file: string, options: Record<string, any>) {
  const {
    noClear,
    noTypeCheck,
    silent,
    compiler,
    watch,
    tscArgs = [],
    tsxArgs = [],
    maxNodeMem,
  } = options;

  if (!noTypeCheck) runTsxCommand();

  function runTsxCommand(): void {
    tsxKiller = run(
      `npx tsx ${[watch ? "--watch" : "", file, tsxArgs].join(" ")}`
    );
  }

  const tscProcess = spawn("node", [
    ...(maxNodeMem ? [`--max_old_space_size=${maxNodeMem}`] : []),
    getCompilerPath(compiler),
    "--noEmit",
    watch ? "--watch" : "",
    ...tscArgs,
  ]);

  if (!tscProcess.stdout) throw new Error("Unable to read Typescript stdout");
  if (!tscProcess.stderr) throw new Error("Unable to read Typescript stderr");

  tscProcess.on("exit", (_: number | null, signal: string | null) => {
    if (signal !== null) process.kill(process.pid, signal);
  });

  tscProcess.stderr.pipe(process.stderr);

  let compilationId = 0;
  let compilationErrorSinceStart = false;

  const rl = createInterface({ input: tscProcess.stdout });

  rl.on("line", function (line) {
    if (noClear) line = deleteClear(line);

    if (!silent)
      print(line, {
        noClear,
      });

    const state = detectState(line);
    const compilationStarted = state.compilationStarted;
    const compilationError = state.compilationError;
    const compilationComplete = state.compilationComplete;

    compilationErrorSinceStart =
      (!compilationStarted && compilationErrorSinceStart) || compilationError;

    if (state.fileEmitted !== null) Signal.emitFile(state.fileEmitted);

    if (compilationStarted) {
      compilationId++;
      killProcesses(compilationId).then((previousCompilationId: any) => {
        if (previousCompilationId !== compilationId) return;

        Signal.emitStarted();
      });
    }

    if (compilationComplete) {
      compilationId++;
      killProcesses(compilationId).then((previousCompilationId: any) => {
        if (previousCompilationId !== compilationId) return;
        if (compilationErrorSinceStart) Signal.emitFail();
        else {
          if (firstTime) {
            firstTime = false;
            Signal.emitFirstSuccess();
          }

          Signal.emitSuccess();
          runTsxCommand();
        }
      });
    }
  });

  if (typeof process.on === "function")
    process.on("message", (msg: string) => {
      if (msg === "run-on-success-command" && tsxKiller)
        tsxKiller().then(runTsxCommand);
    });

  const sendSignal = (msg: string) => process.send && process.send(msg);

  const Signal = {
    emitStarted: () => sendSignal("started"),
    emitFirstSuccess: () => sendSignal("first_success"),
    emitSuccess: () => sendSignal("success"),
    emitFail: () => sendSignal("compile_errors"),
    emitFile: (path: string) => sendSignal(`file_emitted:${path}`),
  };

  nodeCleanup((_exitCode: number | null, signal: string | null) => {
    if (signal) tscProcess.kill(signal as any);

    killProcesses(0).then(() => process.exit());
    // don't call cleanup handler again
    uninstall();
    return false;
  });
}
