import * as fs from "fs";
import * as path from "path";

interface DependencyOptions {
  extensions?: string[];
  exclude?: RegExp;
  maxDepth?: number;
}

function extractDependencies(content: string, currentFile: string): string[] {
  const dependencies: string[] = [];
  const currentDir = path.dirname(currentFile);

  // Regex patterns for different import styles
  const patterns = [
    // ES6 imports: import ... from 'path'
    /import\s+(?:[\w{}\s,*]+\s+from\s+)?['"]([^'"]+)['"]/g,
    // CommonJS: require('path')
    /require\s*\(['"]([^'"]+)['"]\)/g,
    // Dynamic imports: import('path')
    /import\s*\(['"]([^'"]+)['"]\)/g,
  ];

  patterns.forEach((pattern) => {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1];

      if (!importPath.startsWith(".") && !importPath.startsWith("/")) continue;

      let resolvedPath: string | null = path.resolve(currentDir, importPath);

      if (!fs.existsSync(resolvedPath))
        resolvedPath = resolveWithExtensions(resolvedPath);

      if (resolvedPath) dependencies.push(resolvedPath);
    }
  });

  return dependencies;
}

function resolveWithExtensions(basePath: string): string | null {
  const extensions = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".json"];

  if (fs.existsSync(basePath)) return basePath;

  for (const ext of extensions) {
    const pathWithExt = basePath + ext;
    if (fs.existsSync(pathWithExt)) return pathWithExt;
  }

  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    for (const ext of extensions) {
      const indexPath = path.join(basePath, `index${ext}`);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }
  }

  return null;
}

function getAllDependencies(
  entryFile: string,
  options: DependencyOptions = {}
): Set<string> {
  const {
    extensions = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"],
    exclude = /node_modules/,
    maxDepth = Infinity,
  } = options;

  const visited = new Set<string>();
  const dependencies = new Set<string>();

  function walk(filePath: string, depth = 0): void {
    const normalizedPath = path.resolve(filePath);

    if (visited.has(normalizedPath) || depth > maxDepth) return;

    visited.add(normalizedPath);

    if (exclude && exclude.test(normalizedPath)) return;

    if (!fs.existsSync(normalizedPath))
      return console.warn(`File not found: ${normalizedPath}`);

    const ext = path.extname(normalizedPath);
    if (!extensions.includes(ext)) return;

    dependencies.add(normalizedPath);

    try {
      const content = fs.readFileSync(normalizedPath, "utf-8");
      const deps = extractDependencies(content, normalizedPath);

      deps.forEach((dep) => walk(dep, depth + 1));
    } catch (error: any) {
      console.error(`Error reading ${normalizedPath}:`, error.message);
    }
  }

  walk(entryFile);
  return dependencies;
}

export { getAllDependencies, extractDependencies, resolveWithExtensions };
export type { DependencyOptions };
