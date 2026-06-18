# ToolGrid - Premium Micro-Tools Framework

ToolGrid is a high-performance, single-domain platform built with **Astro** and **Tailwind CSS**. It houses an entire suite of "Zero-Trust", client-side micro-tools ranging from Video Compression to Ad-Blocker generation.

## 🚀 The Tools

### Group 1: High-Volume Traffic Engines
1. **Free Video Compressor:** Uses `ffmpeg.wasm` for local, multi-threaded MP4 compression.
2. **HD Background Remover:** Leverages `@imgly/background-removal` to isolate subjects using in-browser AI.
3. **Image-to-Text OCR:** Secure text extraction powered by `tesseract.js`.
4. **Device Mockup Studio:** Pure HTML5 Canvas engine for generating 4K device mockups.
5. **Batch Image Vectorizer:** Traces raster images into scalable SVGs natively.
6. **Audio Format Converter:** Extracts PCM audio and encodes to MP3 using `lamejs`.
7. **Ad-Blocker Generator:** Dynamically creates zero-trust Manifest V3 `.zip` extensions using `JSZip`.

### Tier S: High-CPC B2B Engines
1. **ATS Resume Keyword Matcher:** Bypasses applicant tracking systems locally.
2. **CSV Data Sanitizer:** Cleans, formats, and deduplicates messy CRM lists.
3. **JSON Visualizer:** Transforms dense payloads into exportable tables.

## 🛠️ Architecture
- **Framework:** Astro (Static Site Generation)
- **Styling:** Tailwind CSS (Premium Dark/Glassmorphism theme)
- **Privacy Model:** Zero-Trust Execution (all heavy processing like FFmpeg, Tesseract, and ImgLy is done securely in the user's browser without any server uploads).

## 📦 Getting Started

To run the framework locally, you must ensure the dev server injects `SharedArrayBuffer` security headers (COOP/COEP) so that WebAssembly tools (like the Video Compressor) can run in a multi-threaded environment.

```bash
cd tool-grid-astro-framework
npm install
npm run dev
```

Open `http://localhost:4321` in your browser.
