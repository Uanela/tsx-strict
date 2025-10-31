import * as fs from "fs";
import * as path from "path";
import {
  getAllDependencies,
  extractDependencies,
  resolveWithExtensions,
} from "../dependency-extractor";

jest.mock("fs");
jest.mock("path");

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe("extractDependencies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPath.dirname.mockReturnValue("/test/dir");
    mockPath.resolve.mockImplementation((...args) => args.join("/"));
  });

  it("should extract ES6 imports", () => {
    const content = `
      import foo from './foo';
      import { bar } from './bar';
      import * as baz from './baz';
    `;
    mockFs.existsSync.mockReturnValue(true);

    const deps = extractDependencies(content, "/test/dir/index.js");

    expect(deps).toContain("/test/dir/./foo");
    expect(deps).toContain("/test/dir/./bar");
    expect(deps).toContain("/test/dir/./baz");
  });

  it("should extract CommonJS requires", () => {
    const content = `
      const foo = require('./foo');
      const bar = require("./bar");
    `;
    mockFs.existsSync.mockReturnValue(true);

    const deps = extractDependencies(content, "/test/dir/index.js");

    expect(deps).toContain("/test/dir/./foo");
    expect(deps).toContain("/test/dir/./bar");
  });

  it("should extract dynamic imports", () => {
    const content = `
      const foo = import('./foo');
      import('./bar').then(m => m.default);
    `;
    mockFs.existsSync.mockReturnValue(true);

    const deps = extractDependencies(content, "/test/dir/index.js");

    expect(deps).toContain("/test/dir/./foo");
    expect(deps).toContain("/test/dir/./bar");
  });

  it("should skip node built-ins", () => {
    const content = `
      import fs from 'fs';
      const path = require('path');
    `;

    const deps = extractDependencies(content, "/test/dir/index.js");

    expect(deps).toHaveLength(0);
  });

  it("should skip external packages", () => {
    const content = `
      import react from 'react';
      const lodash = require('lodash');
    `;

    const deps = extractDependencies(content, "/test/dir/index.js");

    expect(deps).toHaveLength(0);
  });

  it("should handle absolute paths", () => {
    const content = `import foo from '/absolute/path/foo';`;
    mockFs.existsSync.mockReturnValue(true);

    const deps = extractDependencies(content, "/test/dir/index.js");

    expect(deps).toContain("/test/dir//absolute/path/foo");
  });
});

describe("resolveWithExtensions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPath.join.mockImplementation((...args) => args.join("/"));
  });

  it("should return path if it exists", () => {
    mockFs.existsSync.mockReturnValue(true);

    const result = resolveWithExtensions("/test/file");

    expect(result).toBe("/test/file");
  });

  it("should try extensions if base path does not exist", () => {
    mockFs.existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    const result = resolveWithExtensions("/test/file");

    expect(result).toBe("/test/file.jsx");
  });

  it("should try index files in directory", () => {
    mockFs.existsSync
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);

    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);

    const result = resolveWithExtensions("/test/dir");

    expect(result).toBe("/test/dir/index.js");
  });

  it("should return null if no resolution found", () => {
    mockFs.existsSync.mockReturnValue(false);

    const result = resolveWithExtensions("/test/nonexistent");

    expect(result).toBeNull();
  });
});

describe("getAllDependencies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPath.resolve.mockImplementation((...args) => args.join("/"));
    mockPath.dirname.mockImplementation((p) =>
      p.split("/").slice(0, -1).join("/")
    );
    mockPath.extname.mockImplementation((p) => {
      const parts = p.split(".");
      return parts.length > 1 ? "." + parts[parts.length - 1] : "";
    });
  });

  it("should return single file with no dependencies", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue("const x = 1;");

    const deps = getAllDependencies("/test/index.js");

    expect(deps.size).toBe(1);
    expect(deps.has("/test/index.js")).toBe(true);
  });

  it("should recursively find all dependencies", () => {
    mockPath.resolve.mockImplementation((...args) =>
      args
        .filter((a) => a)
        .join("/")
        .replace(/\/\.\//g, "/")
    );

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync
      .mockReturnValueOnce(`import './foo';`)
      .mockReturnValueOnce(`import './bar';`)
      .mockReturnValueOnce(`const x = 1;`);

    const deps = getAllDependencies("/test/index.js");

    expect(deps.size).toBe(3);
  });

  it("should respect maxDepth option", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync
      .mockReturnValueOnce(`import './foo';`)
      .mockReturnValueOnce(`import './bar';`);

    const deps = getAllDependencies("/test/index.js", { maxDepth: 0 });

    expect(deps.size).toBe(1);
    expect(deps.has("/test/index.js")).toBe(true);
  });

  it("should filter by extensions", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue("");

    const deps = getAllDependencies("/test/index.json", {
      extensions: [".js", ".ts"],
    });

    expect(deps.size).toBe(0);
  });

  it("should exclude paths matching pattern", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue("");

    const deps = getAllDependencies("/test/node_modules/index.js", {
      exclude: /node_modules/,
    });

    expect(deps.size).toBe(0);
  });

  it("should handle circular dependencies", () => {
    mockPath.resolve.mockImplementation((...args) =>
      args
        .filter((a) => a)
        .join("/")
        .replace(/\/\.\//g, "/")
    );

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync
      .mockReturnValueOnce(`import './foo';`)
      .mockReturnValueOnce(`import './index';`);

    const deps = getAllDependencies("/test/index.js");

    expect(deps.size).toBe(2);
  });

  it("should handle missing files gracefully", () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

    mockFs.existsSync.mockReturnValue(false);

    const deps = getAllDependencies("/test/nonexistent.js");

    expect(deps.size).toBe(0);
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it("should handle read errors gracefully", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation(() => {
      throw new Error("Permission denied");
    });

    const deps = getAllDependencies("/test/index.js");

    expect(deps.size).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
