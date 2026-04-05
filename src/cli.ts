#!/usr/bin/env node
import { Command } from "commander";
import { runTsxStrict } from "./index";
import "./index";
import { readFileSync } from "fs";
import path from "path";

const packageJson = JSON.parse(
  readFileSync(path.resolve(__dirname, "../package.json"), "utf8")
);
const program = new Command();

function collect(value: any, previous: any) {
  return previous.concat([value]);
}

program
  .name("tsx-strict")
  .name("tsxs")
  .description("The TSX with automatic Type-checking")
  .version(packageJson.version)
  .argument("<file>", "TypeScript file to run")
  .option("-w, --watch", "Enable watch mode", false)
  .option("--include <pattern>", "Include glob pattern to watch", collect, [])
  .option("--no-clear", "Do not clear screen", true)
  .option("--compiler <compiler>", "Compiler", "typescript/bin/tsc")
  .option("-p, --path <path>", "tsconfig.json path", "tsconfig.json")
  .option("--tsc-args <args...>", "Additional tsc arguments")
  .option("--tsx-args <args...>", "Additional tsx arguments")
  .option("-n, --no-type-check", "Skip type checking (run tsx directly)", true)
  .option("--maxNodeMem <maxNodeMem>", "Sets up max node memory", "4096")
  .action(async (file, options) => {
    try {
      await runTsxStrict(file, options);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program.parse();
