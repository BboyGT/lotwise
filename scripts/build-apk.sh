#!/usr/bin/env bash
set -e

echo "============================================"
echo "  LOTWISE — APK BUILD (via PWABuilder)"
echo "============================================"
echo ""
echo "This script packages the PWA as an Android APK."
echo ""
echo "PREREQUISITES:"
echo "  1. Deploy the app online (Vercel recommended)"
echo "     - Push to GitHub"
echo "     - Import on https://vercel.com"
echo "     - Get your URL (e.g. https://lotwise.vercel.app)"
echo ""
echo "  2. Use PWABuilder to generate the APK:"
echo "     - Go to https://www.pwabuilder.com"
echo "     - Enter your deployed URL"
echo "     - Click 'Analyze'"
echo "     - Click 'Package for Stores' → Android"
echo "     - Download the .apk file"
echo "     - Sideload on Android or upload .aab to Google Play"
echo ""
echo "ALTERNATIVE — Manual TWA (Trusted Web Activity):"
echo "  1. Install bubblewrap CLI:  npm i -g @bubblewrap/cli"
echo "  2. Initialize:             bubblewrap init --manifest https://YOUR_URL/manifest.json"
echo "  3. Build APK:              bubblewrap build"
echo "  4. Output: app-release-signed.apk"
echo ""
echo "INSTALL ON PHONE:"
echo "  - Transfer .apk to Android phone"
echo "  - Enable 'Install from unknown sources' in Settings"
echo "  - Open the .apk file → Install"
echo "  - App appears on home screen with Lotwise icon"
echo ""

# Check if the app is deployed
if [ -z "$1" ]; then
  echo "USAGE: ./scripts/build-apk.sh https://your-deployed-url.com"
  echo ""
  echo "Or follow the manual steps above."
  exit 0
fi

DEPLOYED_URL="$1"
echo "▶ Checking PWA manifest at $DEPLOYED_URL..."
MANIFEST=$(curl -sL "$DEPLOYED_URL/manifest.json" 2>/dev/null)

if [ -z "$MANIFEST" ]; then
  echo "  ❌ No manifest.json found at $DEPLOYED_URL/manifest.json"
  echo "  Make sure the app is deployed and accessible."
  exit 1
fi

echo "  ✅ Manifest found"
echo "  ✅ PWA is ready for packaging"
echo ""
echo "▶ Go to https://www.pwabuilder.com"
echo "  Enter: $DEPLOYED_URL"
echo "  Click: Package for Stores → Android"
echo "  Download: .apk"
echo ""

# Try bubblewrap if installed
if command -v bubblewrap &> /dev/null; then
  echo "▶ bubblewrap CLI detected!"
  echo "  Run: bubblewrap init --manifest $DEPLOYED_URL/manifest.json"
  echo "  Then: bubblewrap build"
else
  echo "▶ To use CLI instead of PWABuilder web:"
  echo "  npm i -g @bubblewrap/cli"
  echo "  bubblewrap init --manifest $DEPLOYED_URL/manifest.json"
  echo "  bubblewrap build"
fi

