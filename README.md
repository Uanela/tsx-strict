# The TSX with automatic type-checking

Run TypeScript files with TSX while providing real-time type checking.

## Features

- Real-time type checking alongside tsx execution
- Watch mode with automatic restarts
- Intelligent process management
- Customizable compiler support
- Memory management options

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

## How It Works

Runs `tsc --noEmit` for type checking and `tsx` for execution. Restarts tsx only when type checking passes and kills previous instances to prevent conflicts.

Built with ♥️ by Uanela Como
