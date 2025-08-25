# tsx-strict

Type-safe TSX runner with automatic type-checking

tsx-strict is a CLI tool that runs TypeScript files with TSX while providing real-time type checking. It combines the speed of tsx with the safety of TypeScript's compiler, ensuring your code is both executable and type-safe.

## Features

- **Real-time type checking**: Runs TypeScript compiler alongside tsx for immediate feedback
- **Watch mode**: Automatically restarts on file changes
- **Intelligent process management**: Kills previous processes when recompilation starts
- **Customizable compiler**: Support for different TypeScript compiler versions
- **Silent mode**: Suppress output when needed
- **Memory management**: Configure Node.js memory limits

## Installation

```bash
npm install -g tsx-strict
```

Or use with npx:

```bash
npx tsx-strict your-file.ts
```

## Usage

### Basic Usage

```bash
tsx-strict app.ts
```

### Watch Mode

```bash
tsx-strict --watch app.ts
```

### Skip Type Checking

```bash
tsx-strict --no-type-check app.ts
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

## Examples

### Basic TypeScript File

```bash
tsx-strict src/index.ts
```

### Watch Mode with Custom TSC Arguments

```bash
tsx-strict --watch --tsc-args --strict --exactOptionalPropertyTypes src/app.ts
```

### Silent Mode

```bash
tsx-strict --silent --no-clear src/worker.ts
```

### Skip Type Checking for Quick Execution

```bash
tsx-strict --no-type-check src/script.ts
```

## How It Works

tsx-strict runs two processes simultaneously:

1. **TypeScript Compiler (tsc)**: Performs type checking with `--noEmit` flag
2. **tsx Runner**: Executes the TypeScript file when compilation succeeds

The tool intelligently manages these processes, restarting tsx only when type checking passes and killing previous instances to prevent resource conflicts.

## Requirements

- Node.js >= 20.0.0
- tsx ^4.20.5 (peer dependency)

## API

You can also use tsx-strict programmatically:

```typescript
import { runTsxStrict } from "tsx-strict";

await runTsxStrict("src/app.ts", {
    watch: true,
    silent: false,
    noClear: false,
    compiler: "typescript/bin/tsc",
    tscArgs: ["--strict"],
    tsxArgs: [],
    noTypeCheck: false,
});
```

## Error Handling

tsx-strict provides clear error messages and exits gracefully on compilation errors. Type errors are displayed in real-time, and the tsx process only runs when compilation is successful.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Repository

[https://github.com/uanela/tsx-strict](https://github.com/uanela/tsx-strict)

## Issues

Report issues at: [https://github.com/uanela/tsx-strict/issues](https://github.com/uanela/tsx-strict/issues)
