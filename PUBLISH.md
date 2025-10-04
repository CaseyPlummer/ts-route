# Publishing Guide

## Quick Steps

1. **Run checks**

   ```bash
   npm whoami           # Verify login
   npm run check        # Type check
   npm run build        # Build both formats
   npm test             # Run tests
   npm pack --dry-run   # Verify package
   ```

2. **Update version**

   ```bash
   npm version patch  # or minor/major
   ```

3. **Publish**
   ```bash
   npm publish --access public --otp=<6-digit-code>
   ```

## Version Types

- `patch` - Bug fixes (1.0.0 → 1.0.1)
- `minor` - New features (1.0.0 → 1.1.0)
- `major` - Breaking changes (1.0.0 → 2.0.0)

## Pre-publish Checklist

- [ ] Type check passes
- [ ] Build succeeds
- [ ] Tests pass
- [ ] README updated
- [ ] Version bumped
- [ ] OTP code ready

## After Publish

- Package available at: https://www.npmjs.com/package/@caseyplummer/ts-route
- Install with: `npm install @caseyplummer/ts-route`
