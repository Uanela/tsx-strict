#!/usr/bin/env node

import nodeCleanup, { uninstall } from "node-cleanup";
import spawn from "cross-spawn";
import { run } from "./runner";
import { detectState, print } from "./stdout-manipulator";
import { createInterface } from "readline";
import { killProcesses } from "./killer";
import { getCompilerPath } from "./compiler-provider";
import { setupFileWatcher, stopFileWatcher } from "./file-watcher";

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
    clear = true,
    typeCheck = true,
    compiler = "tsc",
    watch = false,
    tscArgs = "",
    tsxArgs = "",
    maxNodeMem,
  } = options;

  function runTsxCommand(): void {
    const tsxArgsArray = [];

    tsxArgsArray.push(file);

    if (tsxArgs.trim()) {
      const additionalArgs = tsxArgs
        .trim()
        .split(/\s+/)
        .filter((arg: string[]) => arg.length > 0);

      const uniqueArgs = Array.from(
        new Set([...tsxArgsArray, ...additionalArgs])
      );
      tsxArgsArray.length = 0;
      tsxArgsArray.push(...uniqueArgs);
    }

    const tsxCommand = `npx tsx ${tsxArgsArray.join(" ")}`;

    if (tsxKiller) tsxKiller?.().then(() => (tsxKiller = run(tsxCommand)));
    else tsxKiller = run(tsxCommand);
  }

  runTsxCommand();

  if (!typeCheck) return;

  const tscArgsArray = [];

  const nodeArgs = maxNodeMem ? [`--max_old_space_size=${maxNodeMem}`] : [];

  tscArgsArray.push(getCompilerPath(compiler));

  tscArgsArray.push("--noEmit");

  if (watch) tscArgsArray.push("--watch");

  if (tscArgs.trim()) {
    const additionalArgs = tscArgs
      .trim()
      .split(/\s+/)
      .filter((arg: string[]) => arg.length > 0);

    const uniqueArgs = Array.from(
      new Set([...tscArgsArray, ...additionalArgs])
    );
    tscArgsArray.length = 0;
    tscArgsArray.push(...uniqueArgs);
  }

  const tscProcess = spawn("node", [...nodeArgs, ...tscArgsArray]);
  if (!tscProcess.stdout) throw new Error("Unable to read Typescript stdout");
  if (!tscProcess.stderr) throw new Error("Unable to read Typescript stderr");

  tscProcess.on("exit", (_: number | null, signal: string | null) => {
    if (signal !== null) process.kill(process.pid, signal);
  });

  tscProcess.stderr.pipe(process.stderr);

  let compilationId = 0;
  let compilationErrorSinceStart = false;
  let hasTsErrors = false;

  async function restartTsx() {
    compilationId++;
    const previousCompilationId: any = await killProcesses(compilationId);

    if (previousCompilationId !== compilationId) return;
    if (compilationErrorSinceStart) Signal.emitFail();
    else {
      Signal.emitSuccess();
      runTsxCommand();
    }
  }

  if (watch) setupFileWatcher(restartTsx);

  const rl = createInterface({ input: tscProcess.stdout });

  rl.on("line", function (line) {
    print(line, {
      clear,
    });

    const state = detectState(line);
    const compilationStarted = state.compilationStarted;
    const compilationError = state.compilationError;
    const compilationCompleteWithoutError =
      state.compilationCompleteWithoutError;

    if (compilationCompleteWithoutError) hasTsErrors = false;
    if (compilationError) {
      hasTsErrors = true;
      compilationId++;
      killProcesses(compilationId).then((previousCompilationId: any) => {
        if (previousCompilationId !== compilationId) return;

        Signal.emitStarted();
      });
    }

    compilationErrorSinceStart =
      (!compilationStarted && compilationErrorSinceStart) || compilationError;

    if (state.fileEmitted !== null) Signal.emitFile(state.fileEmitted);

    if (compilationCompleteWithoutError && !hasTsErrors && !firstTime) {
      compilationId++;
      killProcesses(compilationId).then((previousCompilationId: any) => {
        if (previousCompilationId !== compilationId) return;
        if (compilationErrorSinceStart) Signal.emitFail();
        else {
          Signal.emitSuccess();
          runTsxCommand();
        }
      });
    } else if (firstTime && compilationCompleteWithoutError && !hasTsErrors) {
      firstTime = false;
      Signal.emitFirstSuccess();
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

    stopFileWatcher();
    killProcesses(0).then(() => process.exit());
    // don't call cleanup handler again
    uninstall();
    return false;
  });
}
