#!/usr/bin/env node

import nodeCleanup, { uninstall } from "node-cleanup";
import { Worker } from "worker_threads";
import spawn from "cross-spawn";
import { detectState, print } from "./stdout-manipulator";
import { createInterface } from "readline";
import { killProcesses } from "./killer";
import { getCompilerPath } from "./compiler-provider";
import { setupFileWatcher, stopFileWatcher } from "./file-watcher";

let firstTime = true;
export let tsxKiller: Worker | null = null;

export function setTsxKiller(value: typeof tsxKiller) {
  tsxKiller = value;
}

export function getTsxKiller() {
  return tsxKiller?.terminate;
}

export async function runTsxStrict(file: string, options: Record<string, any>) {
  process.env.FORCE_COLOR = "3";
  const {
    clear = true,
    typeCheck = true,
    compiler = "tsc",
    watch = false,
    tscArgs = "",
    tsxArgs = "",
    maxNodeMem,
    restartDelay,
  } = options;

  async function runTsxCommand(): Promise<void> {
    const tsxArgsArray: string[] = [];

    tsxArgsArray.push(file);

    if (tsxArgs.trim()) {
      const additionalArgs = tsxArgs
        .trim()
        .split(/\s+/)
        .filter((arg: string) => arg.length > 0);

      const uniqueArgs = Array.from(
        new Set([...tsxArgsArray, ...additionalArgs])
      );
      tsxArgsArray.length = 0;
      tsxArgsArray.push(...uniqueArgs);
    }

    if (tsxKiller) {
      await tsxKiller.terminate();
      tsxKiller = null;
    }

    tsxKiller = new Worker(file, {
      argv: tsxArgsArray,
      execArgv: ["-r", "tsx/cjs"],
    });

    tsxKiller.on("error", (error) => {
      if (!error.message.includes("require() of ES Module")) throw error;
      tsxKiller = new Worker(file, {
        argv: tsxArgsArray,
        execArgv: ["-r", "tsx"],
      });

      tsxKiller.on("error", (error) => {
        throw error;
      });

      tsxKiller.on("exit", (code) => {
        console.error(`Worker stopped with exit code ${code}`);
      });
    });

    tsxKiller.on("exit", (code) => {
      if (code !== 0 && code !== 1)
        console.error(`Worker stopped with exit code ${code}`);
    });
  }

  await runTsxCommand();

  if (!typeCheck) return;

  const tscArgsArray: string[] = [];

  const nodeArgs = maxNodeMem ? [`--max_old_space_size=${maxNodeMem}`] : [];

  tscArgsArray.push(getCompilerPath(compiler));

  tscArgsArray.push("--noEmit");

  if (watch) tscArgsArray.push("--watch");

  if (tscArgs.trim()) {
    const additionalArgs = tscArgs
      .trim()
      .split(/\s+/)
      .filter((arg: string) => arg.length > 0);

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
    const previousCompilationId = await killProcesses(compilationId);
    if (previousCompilationId !== compilationId) return;
    if (compilationErrorSinceStart) Signal.emitFail();
    else {
      Signal.emitSuccess();
      await runTsxCommand();
    }
  }

  if (watch) setupFileWatcher(restartTsx, Number(restartDelay));

  const rl = createInterface({ input: tscProcess.stdout });

  rl.on("line", async function (line) {
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
      const previousCompilationId = await killProcesses(compilationId);
      if (previousCompilationId !== compilationId) return;

      Signal.emitStarted();
    }

    compilationErrorSinceStart =
      (!compilationStarted && compilationErrorSinceStart) || compilationError;

    if (state.fileEmitted !== null) Signal.emitFile(state.fileEmitted);

    if (compilationCompleteWithoutError && !hasTsErrors && !firstTime) {
      compilationId++;
      const previousCompilationId = await killProcesses(compilationId);
      if (previousCompilationId !== compilationId) return;
      if (compilationErrorSinceStart) Signal.emitFail();
      else {
        Signal.emitSuccess();
        await runTsxCommand();
      }
    } else if (firstTime && compilationCompleteWithoutError && !hasTsErrors) {
      firstTime = false;
      Signal.emitFirstSuccess();
    }
  });

  if (typeof process.on === "function")
    process.on("message", async (msg: string) => {
      if (msg === "run-on-success-command" && tsxKiller) {
        await tsxKiller.terminate();
        await runTsxCommand();
      }
    });

  const sendSignal = (msg: string) => process.send && process.send(msg);

  const Signal = {
    emitStarted: () => sendSignal("started"),
    emitFirstSuccess: () => sendSignal("first_success"),
    emitSuccess: () => sendSignal("success"),
    emitFail: () => sendSignal("compile_errors"),
    emitFile: (path: string) => sendSignal(`file_emitted:${path}`),
  };

  (nodeCleanup as any)(
    async (_exitCode: number | null, signal: string | null) => {
      if (signal) tscProcess.kill(signal as any);

      if (tsxKiller) {
        await tsxKiller.terminate();
      }

      stopFileWatcher();
      await killProcesses(0);
      // don't call cleanup handler again
      uninstall();
      process.exit();
      return false;
    }
  );
}
