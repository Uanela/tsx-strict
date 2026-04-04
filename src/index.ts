#!/usr/bin/env tsx

import nodeCleanup, { uninstall } from "node-cleanup";
import spawn from "cross-spawn";
import { run } from "./runner";
import { detectState, print } from "./stdout-manipulator";
import { createInterface } from "readline";
import { killProcesses } from "./killer";
import { getCompilerPath, getTscArgs } from "./compiler-provider";
import { setupFileWatcher, stopFileWatcher } from "./file-watcher";
import { loadConfig } from "./utils/config-loader";

let firstTime = true;
export let tsxKiller: (() => Promise<void>) | null = null;

export function setTsxKiller(value: typeof tsxKiller) {
  tsxKiller = value;
}

export function getTsxKiller() {
  return tsxKiller;
}

export let status: { hasTsErrors?: boolean } & Record<string, any> = {};

export function getStatus() {
  return status;
}

export type ProgramOptions = {
  watch: boolean;
  include?: string | undefined;
  clear: boolean;
  compiler: string;
  path: string;
  tscArgs?: string[] | undefined;
  tsxArgs?: string[] | undefined;
  typeCheck: boolean;
  maxNodeMem: string;
};

export async function runTsxStrict(file: string, options: ProgramOptions) {
  const fileConfig = await loadConfig();
  const {
    clear = true,
    typeCheck = true,
    compiler,
    watch = false,
    tscArgs = [],
    tsxArgs = [],
    maxNodeMem,
  } = { ...options, ...fileConfig };

  status = { ...options, ...status } as Record<string, any>;

  function runTsxCommand(): void {
    const tsxArgsArray = [];

    tsxArgsArray.push(file);

    const uniqueArgs = Array.from(new Set([...tsxArgsArray, ...tsxArgs]));
    tsxArgsArray.length = 0;
    tsxArgsArray.push(...uniqueArgs);

    const tsxCommand = `${process.env.npm_lifecycle_script === "npx" ? "npx " : ""}tsx ${tsxArgsArray.join(" ")}`;

    if (tsxKiller) tsxKiller?.().then(() => (tsxKiller = run(tsxCommand)));
    else tsxKiller = run(tsxCommand);
  }

  runTsxCommand();

  if (!typeCheck) return;

  const tscArgsArray = [];

  const nodeArgs = maxNodeMem ? [`--max_old_space_size=${maxNodeMem}`] : [];

  tscArgsArray.push(getCompilerPath(compiler));
  tscArgsArray.push(...getTscArgs(file));
  tscArgsArray.push("--noEmit");

  if (watch) tscArgsArray.push("--watch");

  const uniqueArgs = Array.from(new Set([...tscArgsArray, ...tscArgs]));
  tscArgsArray.length = 0;
  tscArgsArray.push(...uniqueArgs);

  const tscProcess = spawn("node", [...nodeArgs, ...tscArgsArray]);
  if (!tscProcess.stdout) throw new Error("Unable to read Typescript stdout");
  if (!tscProcess.stderr) throw new Error("Unable to read Typescript stderr");

  tscProcess.on("exit", (_: number | null, signal: string | null) => {
    if (signal !== null) process.kill(process.pid, signal);
  });

  tscProcess.stderr.pipe(process.stderr);

  let compilationId = 0;
  let compilationErrorSinceStart = false;
  status.hasTsErrors = false;

  function restartTsx() {
    compilationId++;
    killProcesses(compilationId).then((previousCompilationId: any) => {
      if (previousCompilationId !== compilationId) return;
      if (compilationErrorSinceStart) Signal.emitFail();
      else {
        Signal.emitSuccess();
        runTsxCommand();
      }
    });
  }

  if (watch) setupFileWatcher(restartTsx, fileConfig);

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

    if (compilationCompleteWithoutError) status.hasTsErrors = false;

    if (compilationError) {
      status.hasTsErrors = true;
      compilationId++;
      killProcesses(compilationId).then((previousCompilationId: any) => {
        if (previousCompilationId !== compilationId) return;

        Signal.emitStarted();
      });
    }

    compilationErrorSinceStart =
      (!compilationStarted && compilationErrorSinceStart) || compilationError;

    if (state.fileEmitted !== null) Signal.emitFile(state.fileEmitted);

    if (compilationCompleteWithoutError && !status.hasTsErrors && !firstTime) {
      compilationId++;
      killProcesses(compilationId).then((previousCompilationId: any) => {
        if (previousCompilationId !== compilationId) return;
        if (compilationErrorSinceStart) Signal.emitFail();
        else {
          Signal.emitSuccess();
          runTsxCommand();
        }
      });
    } else if (
      firstTime &&
      compilationCompleteWithoutError &&
      !status.hasTsErrors
    ) {
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
