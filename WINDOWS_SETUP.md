# Windows Setup Notes

## Fixed Issues

This project was updated to support Windows development environments. The following changes were made:

### 1. Preinstall Script
- **Problem:** The root `preinstall` script in `package.json` used shell commands (`sh`) which are not available on Windows by default.
- **Solution:** Replaced with a cross-platform Node.js one-liner that:
  - Removes `package-lock.json` and `yarn.lock` files
  - Enforces the use of `pnpm` as the package manager

### 2. Native Bindings
- **Problem:** Several build tools require platform-specific native bindings (Node.js C++ modules compiled for Windows x64).
- **Solution:** Added optional dependencies to `package.json`:
  - `@rollup/rollup-win32-x64-msvc@4.60.3` — Rollup bundler native binding
  - `@tailwindcss/oxide-win32-x64-msvc@4.3.0` — Tailwind CSS optimizer native binding
  - `lightningcss-win32-x64-msvc@1.32.0` — Lightning CSS preprocessor native binding

## To Set Up on Windows

```powershell
pnpm install
pnpm --filter @workspace/unisphere run dev
```

If you encounter "Cannot find module" errors for native bindings, run:

```powershell
pnpm approve-builds --all
pnpm install
```

## For Non-Windows Users

If you're on macOS or Linux, these optional dependencies won't be installed (they're Windows-specific). The build tools will use the appropriate native bindings for your platform automatically via pnpm's resolution strategy.
