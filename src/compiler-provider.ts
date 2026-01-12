import path from "path";
import fs from "fs";

export function getCompilerPath(
  compilerArg: string | null,
  resolver: NodeRequire["resolve"] = require.resolve
): string {
  if (!compilerArg) compilerArg = "typescript/bin/tsc";

  try {
    return resolver(compilerArg, { paths: [process.cwd()] });
  } catch (e) {}

  let currentDir = process.cwd();
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    try {
      return resolver(compilerArg, { paths: [currentDir] });
    } catch (e) {}
    currentDir = path.dirname(currentDir);
  }

  try {
    return resolver(compilerArg);
  } catch (e) {}

  const globalPaths = [
    `${process.env.HOME}/.nvm/versions/node/${process.version}/lib/node_modules`,
    `${process.env.HOME}/.npm-global/lib/node_modules`,
    `${process.env.HOME}/.pnpm-global`,
    "/usr/local/lib/node_modules",
    "/usr/lib/node_modules",
  ];

  for (const globalPath of globalPaths) {
    try {
      return resolver(compilerArg, { paths: [globalPath] });
    } catch (e) {}
  }

  try {
    const { execSync } = require("child_process");
    const tscPath = execSync("which tsc", { encoding: "utf-8" }).trim();
    if (tscPath) return tscPath;
  } catch (e) {}

  console.error(`Could not find TypeScript compiler at "${compilerArg}"`);
  console.error(
    "Tried local node_modules, parent directories, and global installations"
  );
  process.exit(9);
}

export function hasTsConfig(): boolean {
  const tsConfigPath = path.join(process.cwd(), "tsconfig.json");
  return fs.existsSync(tsConfigPath);
}

export function isESM(filePath?: string): boolean {
  // Check file extension
  if (filePath) {
    const ext = path.extname(filePath);
    if (ext === ".mts" || ext === ".mjs") return true;
    if (ext === ".cts" || ext === ".cjs") return false;
  }

  // Check package.json
  try {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    return packageJson.type === "module";
  } catch (e) {
    return false; // Default to CJS
  }
}

export function getTscArgs(userFilePath: string): string[] {
  const args: string[] = [];

  if (hasTsConfig()) return args;

  const module = isESM(userFilePath) ? "ES2020" : "commonjs";

  args.push(
    userFilePath,
    "--target",
    "ES2020",
    "--lib",
    "ES2020,DOM",
    "--strict",
    "--module",
    module,
    "--esModuleInterop",
    "--skipLibCheck",
    "--forceConsistentCasingInFileNames",
    "--moduleResolution",
    "node",
    "--resolveJsonModule",
    "--tsBuildInfoFile",
    "--incremental"
  );

  return args;
}
