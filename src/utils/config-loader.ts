import { existsSync } from "fs";
import { join } from "path";
import { TsxStrictConfig } from "../config";

const CONFIG_FILES = [
  "tsx-strict.config.ts",
  "tsx-strict.config.js",
  "tsx-strict.config.mjs",
  "tsxs.config.ts",
  "tsxs.config.js",
  "tsxs.config.mjs",
];

let config: TsxStrictConfig;

export async function loadConfig(): Promise<Partial<TsxStrictConfig>> {
  if (config) return config;

  for (const file of CONFIG_FILES) {
    const fullPath = join(process.cwd(), file);
    if (existsSync(fullPath)) {
      const mod = await import(fullPath);
      config = mod.default ?? mod;
    }
  }
  return config || {};
}
