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

  const sendSignal = (msg: string) => process.send && process.send(msg);

  const Signal = {
    emitStarted: () => sendSignal("started"),
    emitFirstSuccess: () => sendSignal("first_success"),
    emitSuccess: () => sendSignal("success"),
    emitFail: () => sendSignal("compile_errors"),
    emitFile: (path: string) => sendSignal(`file_emitted:${path}`),
  };

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

  // tsx starts immediately, no waiting for tsc
  runTsxCommand();

  if (!typeCheck) return;

  const tscArgsArray: string[] = [];
  const nodeArgs = maxNodeMem ? [`--max_old_space_size=${maxNodeMem}`] : [];

  tscArgsArray.push(getCompilerPath(compiler));
  tscArgsArray.push(...getTscArgs(file));
  tscArgsArray.push("--noEmit");
  // No --watch — tsc is always a fresh single-pass process

  const uniqueArgs = Array.from(new Set([...tscArgsArray, ...tscArgs]));
  tscArgsArray.length = 0;
  tscArgsArray.push(...uniqueArgs);

  status.hasTsErrors = false;
  let currentTscProcess: ReturnType<typeof spawn> | null = null;

  function spawnTscProcess() {
    if (currentTscProcess) currentTscProcess.kill();

    const tscProcess = spawn("node", [...nodeArgs, ...tscArgsArray]);
    currentTscProcess = tscProcess;

    if (!tscProcess.stdout) throw new Error("Unable to read Typescript stdout");
    if (!tscProcess.stderr) throw new Error("Unable to read Typescript stderr");

    tscProcess.on("exit", (_: number | null, signal: string | null) => {
      if (signal !== null) process.kill(process.pid, signal as any);
    });

    tscProcess.stderr.pipe(process.stderr);

    const rl = createInterface({ input: tscProcess.stdout });
    rl.on("line", function (line) {
      print(line, { clear });

      const state = detectState(line);

      if (state.compilationCompleteWithoutError) {
        status.hasTsErrors = false;
        if (firstTime) {
          firstTime = false;
          Signal.emitFirstSuccess();
        } else {
          Signal.emitSuccess();
          runTsxCommand();
        }
      }

      if (state.compilationError && !status.hasTsErrors) {
        status.hasTsErrors = true;
        // tsc found errors — kill tsx immediately
        if (tsxKiller) tsxKiller();
        Signal.emitFail();
      }

      if (state.fileEmitted !== null) Signal.emitFile(state.fileEmitted);
    });
  }

  function restartTsx() {
    if (!status.hasTsErrors) runTsxCommand();
    spawnTscProcess();
  }

  if (watch) setupFileWatcher(restartTsx, fileConfig);

  // Initial tsc run (tsx already started above)
  spawnTscProcess();

  if (typeof process.on === "function")
    process.on("message", (msg: string) => {
      if (msg === "run-on-success-command" && tsxKiller)
        tsxKiller().then(runTsxCommand);
    });

  nodeCleanup((_exitCode: number | null, signal: string | null) => {
    if (signal && currentTscProcess) currentTscProcess.kill(signal as any);
    stopFileWatcher();
    killProcesses(0).then(() => process.exit());
    uninstall();
    return false;
  });
}
