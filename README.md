# BugLens 🔍

> **See the bug. Trace the cause. Verify the fix.**  
> *Multimodal UI debugging assistant for developers powered by Gemma 4.*

---

## 🚀 Overview

**BugLens** is an AI-powered visual UI debugging workstation designed to help developers identify, diagnose, and verify front-end defects from screenshots and descriptions. Built with Google's **Gemma 4 multimodal models**, BugLens delivers instant visual health scores, ranked issue breakdowns, evidence-backed root cause analyses, and side-by-side Before/After fix verification.

---

## ✨ Features

- **Multimodal Visual UI Analysis**:
  - Upload a single screenshot (Before / Current UI) or dual screenshots (Before + Optional After Fix).
  - Drag-and-drop, clipboard paste (`Ctrl+V`), and automatic dimension measurement.
- **Judge-First Scannable Report**:
  - **Verdict Banner**: `✓ NO BUG CONFIRMED`, `⚠ POTENTIAL UI ISSUE`, or `✕ UI BUG DETECTED`.
  - **Core Metrics**: UI Health Score (`0–100`), Segmented Severity Meter (`LOW / MED / HIGH / CRIT`), AI Confidence (`%`), and Issue Counts.
  - **UI Quality Scores**: 6 visual dimensions (Layout, Visual Consistency, Spacing & Alignment, Typography, Accessibility, Responsiveness).
  - **Ranked Findings**: Numbered issues with severity tags and concise single-line explanations.
  - **WHY BUGLENS THINKS THIS**: Concrete visual evidence points with status badges (`✓`, `⚠`, `✕`).
  - **Root Cause & Recommended Action**: Inferred architectural causes and actionable fix guidelines.
- **Before / After Fix Verification**:
  - Side-by-side comparison visualization.
  - Numerical health progression (`55 / 100 → 92 / 100`) and improvement score (`+37`).
  - Automated detection of remaining issues and visual regressions.
- **Real-Time Analytics Dashboard**:
  - Live aggregate statistics calculated directly from your debugging sessions.
  - Severity breakdown, fix verification ratio, activity trend over time, and category charts.
  - History log with searchable session records.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.10+, Flask, `google-genai` SDK
- **AI Model**: Google Gemma 4 (`gemma-4-31b-it`)
- **Frontend**: Vanilla HTML5, CSS3 (Dark DevTools theme), Vanilla JavaScript (ES6+)
- **Storage**: Client-side `localStorage` for session history and privacy

---

## 📦 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/ayushshinde2029-maker/BugLens.git
cd BugLens
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure API Key
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

### 4. Run the application
```bash
python server.py
```
Open [http://localhost:5000](http://localhost:5000) in your browser.

---

## 📄 License

MIT License.
