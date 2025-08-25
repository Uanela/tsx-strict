# Contributing to tsx-strict

Thank you for your interest in contributing to tsx-strict! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/tsx-strict.git`
3. Install dependencies: `npm install`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Type check
npm run typecheck

# Clean build artifacts
npm run clean
```

## Project Structure

```
tsx-strict/
├── src/           # Source code
├── bin/           # Binary executables
├── dist/          # Built files (generated)
├── examples/      # Example usage
└── package.json
```

## Development Guidelines

### Code Style

- Use TypeScript for all source code
- Follow existing code formatting and style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Testing

Currently, tests are not implemented. If you'd like to contribute tests:

1. Set up a testing framework (Jest recommended)
2. Add unit tests for core functionality
3. Add integration tests for CLI behavior
4. Update package.json scripts

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add support for custom tsx arguments
fix: resolve process cleanup issue in watch mode
docs: update README with new options
```

### Pull Request Process

1. Ensure your code builds successfully: `npm run build`
2. Update documentation if you've changed functionality
3. Add or update tests for new features
4. Update CHANGELOG.md with your changes
5. Submit a pull request with a clear description

## Types of Contributions

### Bug Reports

When reporting bugs, please include:

- tsx-strict version
- Node.js version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Sample code if applicable

### Feature Requests

For new features:

- Describe the use case
- Explain why it would be valuable
- Consider backward compatibility
- Provide examples of how it would work

### Code Contributions

Areas where contributions are especially welcome:

- Performance improvements
- Better error handling
- Additional CLI options
- Cross-platform compatibility
- Test coverage
- Documentation improvements

## Development Tips

### Building and Testing Locally

```bash
# Build the project
npm run build

# Test your changes
./bin/tsx-strict.js examples/test-file.ts

# Test in watch mode
./bin/tsx-strict.js --watch examples/test-file.ts
```

### Debugging

- Use `console.log` statements during development
- Test with various TypeScript configurations
- Verify behavior in both watch and non-watch modes

## Release Process

Releases are handled by maintainers:

1. Update version in package.json
2. Update CHANGELOG.md
3. Build and test
4. Publish to npm
5. Create GitHub release

## Getting Help

- Open an issue for questions
- Check existing issues and PRs
- Review the source code and documentation

## Code of Conduct

Be respectful and constructive in all interactions. We're here to build something useful together.

## Questions?

Feel free to open an issue with questions about contributing or reach out to the maintainers.
