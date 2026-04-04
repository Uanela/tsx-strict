# The TSX with automatic Type-Checking

Run TypeScript files with TSX while providing real-time type checking.

## Features

- Real-time type checking alongside tsx execution
- Watch mode with automatic restarts
- Intelligent process management
- Customizable compiler support
- Memory management options
- Config file support (`tsx-strict.config.ts` / `tsxs.config.ts`)

## Installation

```bash
pnpm install -g tsx-strict
```

Or use with npx:

```bash
npx tsxs src/index.ts
```

## Usage

```bash
tsxs app.ts
```

### Watch Mode

```bash
tsxs --watch app.ts
```

### Skip Type Checking

```bash
tsxs --no-type-check app.ts
```

## CLI Options

| Option                 | Description                              | Default              |
| ---------------------- | ---------------------------------------- | -------------------- |
| `-w, --watch`          | Enable watch mode                        | `false`              |
| `--no-clear`           | Do not clear screen                      | `false`              |
| `--compiler`           | Compiler path                            | `typescript/bin/tsc` |
| `--tsc-args <args...>` | Additional TypeScript compiler arguments | `[]`                 |
| `--tsx-args <args...>` | Additional tsx arguments                 | `[]`                 |
| `--silent`             | Suppress output                          | `false`              |
| `--no-type-check`      | Skip type checking (run tsx directly)    | `false`              |

## Config File

Create a `tsx-strict.config.ts` or `tsxs.config.ts` at your project root for persistent configuration. CLI args always take precedence over the config file.

```typescript
import { defineConfig } from "tsx-strict/config";

export default defineConfig({
    watch: true,
    clear: true,
    typeCheck: true,
    compiler: "typescript/bin/tsc",
    tscArgs: ["--strict"],
    tsxArgs: ["--env-file=.env"],
    maxNodeMem: "4096",
});
```

### Watch Options

`watch` can be `true` to use defaults, or an object for full control:

```typescript
import { defineConfig } from "tsx-strict/config";

export default defineConfig({
    watch: {
        include: ["src/**"],
        ignore: ["**/*.test.ts", /generated/, (path) => path.includes("dist")],
        extensions: ["ts", "tsx", "js"],
    },
});
```

## How It Works

Runs `tsc --noEmit` for type checking and `tsx` for execution. Restarts tsx only when type checking passes and kills previous instances to prevent conflicts.

Built with ♥️ by Uanela Como
