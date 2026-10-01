# YouTube Closed Caption (CC) & Transcript Parsing Specification

> **Status:** Planned / Queued for **Milestone M5** (Not Implemented Yet)  
> **Cross-Reference:** [`initialisation documents/02-milestones-m1-m4.md`](file:///c:/Users/rob_b/Ryff/initialisation%20documents/02-milestones-m1-m4.md#m5--youtube-cc--transcript-parsing-pipeline)

---

## 🎯 Objective & Overview

Currently, Ryff ingests YouTube channel Atom feeds (`https://www.youtube.com/feeds/videos.xml?channel_id=...`). The RSS payload only provides the video title and top text of the description box. 

When creators use generic or sponsor-heavy descriptions, the Fast AI digest model cannot see the actual conclusions, gear verdicts, or specs discussed inside the video.

**M5 YouTube CC Parsing** extends the pipeline so that when a YouTube feed item is ingested:
1. Ryff attempts to fetch the public auto-generated or manual Closed Caption / Subtitle track (.timedtext XML / track JSON) for the video.
2. The transcript is sanitized (sponsor fluff, music markers, intro banter trimmed).
3. The sanitized transcript (up to ~2,500–3,000 words) is passed alongside the title into the Fast AI digest stage (`digest.ts`).
4. The Fast AI synthesizes an accurate ≤40-word summary reflecting the creator's *actual spoken conclusions and verdict*, while Hank and Vee get grounded quotes and opinions for their 4-turn debate.

---

## 🏗️ Architecture & Implementation Strategy

### 1. Extraction Helper (`src/lib/youtube.ts`)
* Use lightweight transcript fetching (e.g. `youtube-transcript` package or direct fetch to YouTube's caption endpoint).
* **Zero paid API key cost**: Pulls publicly available auto-generated caption tracks directly without invoking paid transcription services (e.g., Whisper).
* **Rate-limiting Safeguards:** Include a 1-second polite delay between consecutive transcript fetches to protect server IP.

### 2. Graceful Fallbacks (Edge Case Handling)
* **No-Speech / Playthrough Demos:** If a video is a pure guitar playthrough or captions are disabled, the fetcher returns `null`.
* **Fallback Behavior:** If transcript fetching returns `null` or errors out, the pipeline seamlessly falls back to Option 1: using the RSS `<title>` and `<media:description>` snippet.

### 3. Digest Prompt Integration (`prompts/digest.system.md`)
* The prompt instructs `MODEL_FAST` (`gemini-3.5-flash-lite`):
  > *"Ignore sponsor shoutouts, intro/outro banter, and channel subscribe calls. Focus strictly on gear specs, sound impressions, host pros/cons, and final verdicts."*

### 4. Cost & Time Budget
* **LLM Cost:** ~3,000 tokens per video ≈ $0.0003 – $0.0005 per processed video on Gemini Flash Lite.
* **Pipeline Latency:** +1.5s to 3s per YouTube video processed (executed entirely inside background pipeline cron jobs; 0ms impact on web users).

---

## 📋 Task Checklist for M5 Implementation

- [ ] Install transcript parsing utility (`youtube-transcript` or internal fetch helper in `src/lib/youtube.ts`).
- [ ] Implement `fetchYouTubeTranscript(videoId: string)` returning cleaned transcript text or `null`.
- [ ] Update `src/pipeline/digest.ts` to check `item.source_type === 'youtube'` and attach transcript text to the `<item>` block.
- [ ] Add sponsor/intro filter logic in `prompts/digest.system.md`.
- [ ] Add unit tests in `tests/youtube.test.ts` with mock caption fixtures.
- [ ] Run dry pipeline test (`pnpm pipeline:run`) verifying YouTube videos digest with transcript-grounded summaries.
