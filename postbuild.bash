echo "Moving puppeteer Chromium cache into app root so it survives the build..."
mkdir -p ./.cache
mv /app/.cache/puppeteer ./.cache 2>/dev/null || echo "No puppeteer cache to move (ok)"
