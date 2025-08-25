# Security Policy

## Supported Versions

We provide security updates for the following versions of tsx-strict:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of tsx-strict seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please send an email to: [uanelaluiswayne@gmail.com]

Include the following information:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

### What to Expect

After you submit a report, we will:

1. Acknowledge receipt of your vulnerability report within 48 hours
2. Provide an estimated timeline for addressing the vulnerability
3. Notify you when the vulnerability has been fixed
4. Credit you in the security advisory (unless you prefer to remain anonymous)

### Security Update Process

When we receive a security bug report, we will:

1. Confirm the problem and determine the affected versions
2. Audit code to find any potential similar problems
3. Prepare fixes for the current release
4. Release new versions as soon as possible
5. Publish a security advisory on GitHub

## Security Best Practices

When using tsx-strict:

### For Users

- Always use the latest version of tsx-strict
- Keep your dependencies up to date
- Be cautious when running TypeScript files from untrusted sources
- Use tsx-strict in trusted environments
- Review TypeScript configuration for security implications

### For Contributors

- Follow secure coding practices
- Validate all inputs
- Use dependencies from trusted sources
- Keep dependencies updated
- Run security audits: `npm audit`

## Scope

This security policy applies to:

- The tsx-strict CLI tool
- Core functionality and dependencies
- Documentation and examples

## Out of Scope

- Vulnerabilities in third-party dependencies (report to respective maintainers)
- Issues in user's TypeScript code
- Issues in Node.js or tsx itself
- General TypeScript security questions

## Vulnerability Disclosure Timeline

We aim to:

- Acknowledge reports within 48 hours
- Provide initial assessment within 1 week
- Release fixes for critical vulnerabilities within 2 weeks
- Release fixes for non-critical vulnerabilities within 4 weeks

## Contact

For any security-related questions or concerns:

- Email: [uanelaluiswayne@gmail.com]
- GitHub: Create a security advisory in the repository

## Attribution

We believe in responsible disclosure and will credit security researchers who help improve tsx-strict's security.
