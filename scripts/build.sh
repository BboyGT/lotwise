#!/usr/bin/env bash
set -e

echo "============================================"
echo "  LOTWISE — FULL BUILD"
echo "============================================"
echo ""

# 1. Lint
echo "▶ Linting..."
npm run lint
echo "  ✅ Lint clean"
echo ""

# 2. Type check
echo "▶ Type checking..."
npm run typecheck
echo "  ✅ TypeScript clean"
echo ""

# 3. Generate icons
echo "▶ Generating PWA icons..."
python3 scripts/generate-icons.py
echo ""

# 4. Build Next.js
echo "▶ Building Next.js production bundle..."
npm run build
echo "  ✅ Build complete"
echo ""

# 5. Summary
echo "============================================"
echo "  BUILD COMPLETE"
echo "============================================"
echo ""
echo "Output: .next/standalone/"
echo "Static: .next/standalone/.next/static/"
echo "Public: .next/standalone/public/"
echo ""
echo "To run production:"
echo "  npm start                    (app only)"
echo "  npm run dev:all              (app + price relay in development)"
echo ""
echo "To deploy:"
echo "  Vercel: Push to GitHub → Import on vercel.com"
echo "  APK:    Use https://www.pwabuilder.com with your deployed URL"
echo ""
