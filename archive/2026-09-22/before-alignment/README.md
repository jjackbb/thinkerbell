<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

현재 프로젝트 점검과 다음 작업: [니편내편 — 기능 검증·GA4·배포·개선 계획](docs/release-improvement/README.md) (2026-09-22)

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/b9769db0-dc1e-4ef4-9acc-476cc5d574ed

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env`, then configure the Supabase values and at least one AI provider key (`POTENS_API_KEY` or `GEMINI_API_KEY`).
3. Run the app:
   `npm run dev`
