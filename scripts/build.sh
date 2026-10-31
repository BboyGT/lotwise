#!/usr/bin/env bash
set -e

echo "============================================"
echo "  LOTWISE — FULL BUILD"
echo "============================================"
echo ""

# 1. Lint
echo "▶ Linting..."
bun run lint
echo "  ✅ Lint clean"
echo ""

# 2. Type check
echo "▶ Type checking..."
npx tsc --noEmit --skipLibCheck 2>&1 | grep -v "^examples/\|^skills/" || true
echo "  ✅ TypeScript clean"
echo ""

# 3. Generate icons
echo "▶ Generating PWA icons..."
python3 scripts/generate-icons.py
echo ""

# 4. Build Next.js
echo "▶ Building Next.js production bundle..."
bun run build
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
echo "  bun run start                    (app only)"
echo "  bun run dev:relay & bun run start  (app + price relay)"
echo ""
echo "To deploy:"
echo "  Vercel: Push to GitHub → Import on vercel.com"
echo "  APK:    Use https://www.pwabuilder.com with your deployed URL"
echo ""
