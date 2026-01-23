# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Recipe Runner seriously. If you discover a security vulnerability, please follow these steps:

### How to Report

1. **Do not** open a public GitHub issue for security vulnerabilities
2. Email the maintainers directly or use GitHub's private vulnerability reporting feature
3. Include as much detail as possible:
   - Type of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment:** We will acknowledge receipt of your report within 48 hours
- **Assessment:** We will investigate and assess the vulnerability
- **Updates:** We will keep you informed of our progress
- **Resolution:** Once fixed, we will notify you and credit you (if desired) in the release notes

### Scope

This security policy applies to:
- The Recipe Runner application code
- Dependencies used in the project
- Configuration and deployment recommendations

### Out of Scope

The following are not considered security vulnerabilities:
- Issues in third-party services (Ollama, Stable Diffusion) - report these to their respective maintainers
- Social engineering attacks
- Physical attacks

## Security Considerations

### Local Data Storage

Recipe Runner stores data locally using IndexedDB (via Dexie.js). All recipe data, cookbooks, and user preferences are stored in the browser's local storage. No data is transmitted to external servers unless explicitly configured.

### AI Integration

- **Ollama:** Runs locally on your machine. No data is sent to external AI services.
- **Stable Diffusion:** Runs locally. Images are generated on your machine.

### Third-Party Dependencies

We regularly review and update dependencies to address known vulnerabilities. Run `npm audit` to check for known issues in dependencies.

## Best Practices for Users

1. Keep your browser updated
2. Only import recipes from trusted sources
3. Review AI-generated content before following safety-critical steps (especially safe cooking temperatures)
4. Keep Ollama and Stable Diffusion installations updated if using AI features
