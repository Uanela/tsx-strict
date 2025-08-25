# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-XX

### Added

- Initial release of tsx-strict
- CLI interface for running TypeScript files with automatic type checking
- Watch mode support with `--watch` flag
- Process management for clean restarts
- Support for custom TypeScript compiler paths
- Additional arguments support for both tsc and tsx
- Silent mode option
- Screen clearing controls
- Type checking bypass option
- Cross-platform compatibility
- Real-time compilation feedback
- Intelligent process killing on recompilation

### Features

- Type-safe execution of TypeScript files
- Simultaneous tsx execution and TypeScript compilation
- Memory management options
- Signal-based process communication
- Cleanup handling for graceful shutdowns

### CLI Options

- `--watch` - Enable watch mode
- `--no-clear` - Do not clear screen
- `--compiler` - Custom compiler path
- `--tsc-args` - Additional TypeScript compiler arguments
- `--tsx-args` - Additional tsx arguments
- `--silent` - Suppress output
- `--no-type-check` - Skip type checking

### Dependencies

- commander for CLI argument parsing
- cross-spawn for cross-platform process spawning
- node-cleanup for graceful shutdown handling
- ps-tree for process tree management
- string-argv for argument parsing

### Development

- TypeScript source code
- Build system with tsc
- Development scripts
- Clean and typecheck commands

## [Unreleased]

### Planned

- Test suite implementation
- Performance optimizations
- Configuration file support
- Plugin system
- Better error reporting
