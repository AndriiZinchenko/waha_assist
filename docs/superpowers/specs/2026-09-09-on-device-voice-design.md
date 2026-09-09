# On-device voice commands ("X against Y") for the iOS home-screen app

## Context

Voice mode already exists in the app: a header mic toggle, unit numbers on every row, the `parseVoiceCommand` parser ("3 against 7", "undo"), the undo chip, and `handleVoiceSelect` in App. It listens through the browser's Web Speech API (`src/lib/speech.ts`). That engine is unavailable exactly where the user wants it: Chrome on iPhone has no speech API at all, Safari refuses the microphone over plain http, and Apple never exposed speech recognition to web apps launched from the home screen.

Goal: keep everything above unchanged and swap only the "audio → text" layer for an on-device recognizer that runs inside the page, so voice works in the home-screen app, offline, in English only (user's choice).

Hosting: the user's own server over https (exact server not stated).

## Verified facts the design rests on (checked, not assumed)

| Fact | How verified |
|---|---|
| `vosk-browser@0.0.8`, Apache-2.0, repo active (last push 2025-12-07), 529 stars, one dependency (`uuid@9`) | npm registry, GitHub API |
| Package is one UMD file `dist/vosk.js` (5.8 MB). Worker code and WASM are embedded (base64 → `atob` → Blob worker, `data:` WASM). No `SharedArrayBuffer`, no pthreads → no COOP/COEP headers needed | grep of the bundle |
| No `process.*` references in the library. The "process is not defined" issue (#73) comes from the example's `microphone-stream` dependency, which we will not use | grep + issue text |
| API: `createModel(url) → Model`; `new model.KaldiRecognizer(sampleRate, grammar?: string)`; `recognizer.on("result" \| "partialresult", msg)`; `acceptWaveform(AudioBuffer)` / `acceptWaveformFloat(Float32Array, sampleRate)`; `recognizer.remove()`; `model.terminate()`. Result payload: `msg.result.text` plus per-word `{word, conf, start, end}` | `dist/model.d.ts`, `interfaces.d.ts`, React example |
| Worker resolves `modelUrl` against the page URL, downloads + extracts the tarball into an Emscripten IDBFS mounted at `/vosk` (persisted to IndexedDB), path derived from the URL string | decoded worker source |
| English small model `vosk-model-small-en-us-0.15.tar.gz`, 41 MB, already packaged as tar.gz at `https://ccoreilly.github.io/vosk-browser/models/`. Contains `graph/HCLr.fst + Gr.fst` (lookahead graph → runtime grammar supported) | download + `tar tzf` |
| Model vocabulary contains every word we need: one…twenty, thirty, against, versus, undo, cancel, go | parsed the FST symbol table |
| `conf/mfcc.conf` has `--allow-downsample=true` → feeding the AudioContext's native 44.1/48 kHz is fine (the React example passes 48000) | read from the tarball |
| Vosk grammar = JSON array of phrases; may include `"[unk]"` for out-of-vocabulary speech; only lookahead models support it | alphacephei docs |
| Workbox precache skips files > 2 097 152 bytes by default (`maximumFileSizeToCacheInBytes`) | `node_modules/workbox-build/build/schema/GenerateSWOptions.json` |
| iOS ≥ 14.5: Web Speech works in Safari only, not in home-screen apps (confirmed by firt.dev and an unanswered Apple forum thread from 2024) | web |
| `getUserMedia` in home-screen apps: fixed in iOS 13.4 (WebKit bug 185448) but an Apple WebKit engineer acknowledged in Aug 2025 that it "does not always work in PWAs" (works on first launch, may fail on relaunch until reboot) | Apple forums thread 797987 |
| Storage: Safari 17+ gives an origin up to 60 % of disk, same for home-screen apps; 7-day eviction does not apply to home-screen apps (own usage counter) | webkit.org blog 14403, MDN |

## Decisions

- **Replace, don't add.** `src/lib/speech.ts` (Web Speech wrapper) is deleted. One recognition path everywhere (Chrome desktop, Android, iOS Safari, iOS home-screen).
- **English only.** One model, 41 MB. Commands are English regardless of the EN/UA UI toggle. Ukrainian number words stay in the parser (harmless) but are not exercised.
- **AudioWorklet, not ScriptProcessorNode.** Supported since Safari 14.1, which is already the floor for everything else here.
- **Model served from our own origin** at `/models/vosk-model-small-en-us-0.15.tar.gz`, stable URL so the library's IDBFS cache path is stable. Offline availability via a service-worker `CacheFirst` route (primary) with a documented fallback if iOS shows the worker bypasses the service worker (see Risks).
- **Strict grammar.** The recognizer is restricted to number words + separators + undo + `[unk]`. Table talk comes back as `[unk]` and is ignored by the parser.
- **Risk first.** Step 1 is a throwaway mic test page deployed to the real server and opened from the home screen on the user's iPhone. If the microphone does not work there, the rest is not built (Capacitor becomes the answer).

## Architecture

```
header VoiceToggle (tap = user gesture)
  └─ App: voiceEnabled → <VoiceCommander>
        └─ useVoskListener(enabled)            src/lib/vosk/useVoskListener.ts
             ├─ loadVoskModel()                src/lib/vosk/model.ts   (lazy import("vosk-browser"), createModel, cached singleton)
             ├─ openMicrophone(ctx)            src/lib/vosk/audio.ts   (getUserMedia → AudioContext → AudioWorkletNode)
             │     worklet posts Float32Array chunks  →  recognizer.acceptWaveformFloat(chunk, ctx.sampleRate)
             ├─ recognizer "result" → text  →  parseVoiceCommand(text)   (existing, small tweaks)
             └─ status: "downloading 37 %" | "loading" | "listening" | "error: …"
  App.handleVoiceSelect (existing, unchanged)
```

Files:
- `src/lib/vosk/model.ts` — new. Lazy-loads the library, downloads the model with progress, creates the model once per page life, exposes `terminate()`.
- `src/lib/vosk/audio.ts` — new. Microphone + AudioContext + worklet plumbing, resume-on-visibility, track-ended detection.
- `src/lib/vosk/worklet.ts` — new. `AudioWorkletProcessor` that batches 128-frame inputs into ~4096-sample Float32Array chunks and posts them (transferable).
- `src/lib/vosk/grammar.ts` — new. Builds the grammar phrase list from the parser's vocabulary (single source of truth).
- `src/lib/vosk/useVoskListener.ts` — new. Hook: state machine (idle → loading → listening → error), wires model + audio + parser, cleans up on toggle-off/unmount.
- `src/lib/voiceCommand.ts` — edit (see Parser changes).
- `src/components/VoiceCommander.tsx` — edit: use the hook instead of `startListening`; render download/loading progress in the existing pill.
- `src/components/VoiceToggle.tsx` — edit: always render; disabled state with reason when `VOICE_SUPPORTED` is false (fixes the "invisible button" confusion from this session).
- `src/App.tsx` — edit: import `VOICE_SUPPORTED` from the new module instead of `SPEECH_SUPPORTED`; on toggle-on, call `navigator.storage.persist?.()`.
- `src/lib/speech.ts` — delete.
- `vite.config.ts` — edit (PWA/workbox config below).
- `public/models/vosk-model-small-en-us-0.15.tar.gz` — new, 41 MB (copied verbatim from the ccoreilly-hosted tar.gz; also add its Apache-2.0 `COPYING`/`NOTICE` alongside as the React example does).
- `public/mic-test.html` — new, throwaway spike page (step 1), removed at the end.
- `package.json` — add `vosk-browser@0.0.8`.

## Step 1 — Risk spike on the real device (before any feature code)

`public/mic-test.html`, plain HTML, no build step: buttons that (a) `getUserMedia({audio:true})` and show the track state + `AudioContext.sampleRate`, (b) `audioWorklet.addModule` from an inline Blob, (c) `WebAssembly.validate` of a tiny module, (d) `navigator.storage.estimate()`, (e) reports `window.navigator.standalone` and `display-mode: standalone`. Log to the page, not the console.

User deploys `dist/` (with this page) to the https server, opens `/mic-test.html` in Safari, adds it to the home screen, and reports results on first launch **and after force-closing and relaunching** (the Aug 2025 Apple-forum failure mode). Also test once in Safari proper.

Go/no-go: mic + worklet + WASM must work in standalone mode on relaunch. If not, stop and switch to the Capacitor plan.

## Step 2 — Dependency + model asset

- `npm i vosk-browser@0.0.8`.
- Download the tarball into `public/models/`. Do not repackage from the alphacephei zip; the tar.gz from ccoreilly is already in the layout the library expects (`<model-dir>/am|conf|graph|ivector`). Add `COPYING` (Apache-2.0) next to it.
- Confirm Vite dev serves it: `curl -sI http://localhost:5173/models/vosk-model-small-en-us-0.15.tar.gz` → 200, `content-type` anything, **no `content-encoding: gzip`** (if a server transparently un-gzips `.gz`, the library receives a raw tar and fails to extract; Apache's default mime config does exactly this via `AddEncoding x-gzip .gz`. Same check is a deployment step).

## Step 3 — Grammar module (`src/lib/vosk/grammar.ts`)

- Export `NUMBER_WORDS_EN` (one…twenty, thirty) from `voiceCommand.ts` so grammar and parser share one list.
- `buildGrammar(): string` returns `JSON.stringify([...numberWords, "against", "versus", "undo", "cancel", "[unk]"])`. Vosk builds the graph from the word set, so single words are enough; phrases are not required.
- Unit test: grammar contains every number word the parser understands, contains `[unk]`, is valid JSON.

## Step 4 — Parser changes (`src/lib/voiceCommand.ts`, TDD)

- Drop `unk` tokens before scanning (`"three unk against seven"` → 3 vs 7).
- Compound numbers: merge `twenty|thirty` followed by a units word (`"twenty three against seven"` → 23 vs 7). Today this misparses as 3 vs 7 because the strict NUMBER SEP NUMBER scan starts at "three".
- Add "cancel" as an undo word (in vocabulary, natural at the table).
- Keep everything else (strict separator, Ukrainian words, glued letters) as is. Tests in `voiceCommand.test.ts` for each bullet.

## Step 5 — Model loader (`src/lib/vosk/model.ts`)

- `VOICE_SUPPORTED = !!(navigator.mediaDevices?.getUserMedia && window.AudioWorkletNode && WebAssembly)`; export a `voiceUnsupportedReason()` string for the disabled toggle.
- `loadVoskModel(onProgress)`: module-level singleton promise.
  1. `const { createModel } = await import("vosk-browser")` — lazy so the 5.8 MB chunk is not in the initial bundle.
  2. Pre-warm the download with progress: `fetch(MODEL_URL)` on the main thread, read the body via `ReadableStream` to report `loaded/total` (Content-Length from the response), and `cache.put()` the response into a Cache Storage bucket `vosk-models`. This gives the progress percentage the library cannot provide and guarantees a local copy independent of the service worker.
  3. `createModel(MODEL_URL, logLevel)` — the worker fetches the same stable URL (served from SW cache / HTTP cache / network) and extracts into IDBFS.
  4. Expose `terminate()`; call it only when the page unloads, not on toggle-off (reload of a 41 MB model per toggle is unacceptable). Toggle-off only removes the recognizer and closes the mic.
- Error mapping: network failure → "Model download failed (41 MB, needs internet once)"; extraction/other → surfaced verbatim in the pill.

## Step 6 — Audio capture (`src/lib/vosk/audio.ts` + `worklet.ts`)

- `worklet.ts`: `class ChunkProcessor extends AudioWorkletProcessor` — accumulates channel 0 into a 4096-sample `Float32Array`, `port.postMessage(buf, [buf.buffer])`. Registered as `"vosk-chunk"`. Loaded via `ctx.audioWorklet.addModule(new URL("./worklet.ts", import.meta.url))` (Vite bundles worklets referenced this way; verify the built URL resolves in `dist/`).
- `openMicrophone()` must run inside the toggle's click handler chain: create `AudioContext` **synchronously in the gesture** (iOS requirement), then `await getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })`, `createMediaStreamSource(stream)` → worklet node → (no destination; a silent `GainNode(0)` to destination keeps some iOS versions rendering).
- Resilience: on `visibilitychange` → `ctx.resume()`; on `track.onended` (phone call, another app took the mic) → report `error: "Microphone was taken by another app — turn voice off and on"`, not a silent hang.
- `close()` stops tracks, disconnects nodes, closes the context.

## Step 7 — Listener hook (`src/lib/vosk/useVoskListener.ts`)

- State: `{ phase: "idle" | "downloading" | "loading" | "listening" | "error", progress?: number, error?: string }`.
- On enable: `phase=downloading` → `loadVoskModel` → `phase=loading` → open mic → `new model.KaldiRecognizer(ctx.sampleRate, buildGrammar())` → `recognizer.on("result", m => onText(m.result.text))` → `phase=listening`.
- Chunks from the worklet → `recognizer.acceptWaveformFloat(chunk, ctx.sampleRate)`.
- On disable/unmount: `recognizer.remove()`, close mic. Model stays loaded.
- `onText` goes through `parseVoiceCommand`; `[unk]`-only or empty text is dropped silently (Vosk emits empty `text` after silences).
- Partial results are ignored (the parser needs the final utterance; Vosk's endpointing rules in `model.conf` close an utterance after 0.5–1.0 s of silence).

## Step 8 — UI wiring

- `VoiceCommander.tsx`: replace `startListening` with the hook. Pill text by phase: "Downloading English model… 37 %" / "Loading model…" / "Listening — say “3 against 7”" / error (warn colour). Keep the undo chip and voice undo exactly as they are.
- `VoiceToggle.tsx`: always render; when unsupported, `disabled` + `title`/`aria-label` with the reason, dimmed. Tapping the disabled toggle shows the reason in a short pill (reuse the feedback pill).
- `App.tsx`: swap the import; request persistent storage on first enable.

## Step 9 — Build / PWA config (`vite.config.ts`)

- `workbox.maximumFileSizeToCacheInBytes: 8 * 1024 * 1024` so the lazy `vosk-browser` chunk (~5.8 MB) is precached and available offline.
- `workbox.runtimeCaching` add `{ urlPattern: ({url}) => url.pathname.startsWith("/models/"), handler: "CacheFirst", options: { cacheName: "vosk-models", cacheableResponse: { statuses: [0, 200] }, expiration: { maxEntries: 2 } } }`.
- `build.rollupOptions.output.manualChunks` not needed; dynamic import already splits.
- Keep `includeAssets`/`globPatterns` as they are (tar.gz deliberately not precached; 41 MB at install time would be wrong).

## Step 10 — Deployment (own https server)

1. `npm run build` → upload `dist/` (includes `models/` and `sw.js`).
2. Server checks: https with a trusted cert; `curl -sI https://<host>/models/vosk-model-small-en-us-0.15.tar.gz` shows 200, correct length (41 184 862), **no `content-encoding`**; long `Cache-Control` on `/models/` and `/assets/` is fine, `sw.js` must be `no-cache`.
3. On the iPhone: open in Safari, allow mic once, add to home screen, launch from the icon. Turn voice on: first run downloads the model (progress in the pill), later runs load from cache.
4. Remove `public/mic-test.html` before the final build.

## Risks and fallbacks

- **iOS mic in standalone mode flaky on relaunch** (Apple engineer, Aug 2025). Detected by step 1. Fallback: Capacitor wrapper with the native speech plugin (separate plan).
- **Service worker may not intercept the blob-URL worker's model download** (so second launch offline could refetch and fail). Detected in verification (offline reload after a successful first load, on Chrome and on the iPhone). Fallback: pass a `blob:` URL from the Cache-Storage copy to `createModel` and `indexedDB.deleteDatabase("/vosk")` before each load to stop IDBFS growth (each blob URL creates a new IDBFS path). Costs a few seconds of extraction per launch; still fully offline.
- **Library re-downloads on every launch even when IDBFS already has the model** (the JS side always calls `downloadAndExtract`; whether the C++ skips existing files is unknown). Mitigated by the Cache-Storage pre-warm (local fetch is fast) — this is why step 5.2 exists.
- **Memory**: extracted model ≈ 100 MB inside the worker + Kaldi state. Fine on iPhones from the last ~6 years; watched during device testing (Safari "This page is using significant memory").
- **Battery/heat** while listening continuously: WASM without SIMD/threads. Accepted by the user (hands-free is the requirement). Mitigation already in place: listening only while the toggle is on.
- **Accuracy in a noisy room**: grammar restriction makes this a ~25-word task; `[unk]` absorbs the rest. If false positives appear, require the phrase to be the whole utterance (parser option) — trivial follow-up.
- **`vosk-browser` last release Dec 2022**: pinned exact version; UMD with embedded worker so bundler drift is minimal. Repo still maintained.

## Verification

Automated (run after every step):
- `npx vitest run` — parser + grammar tests (Steps 3–4).
- `npx tsc -b && npx eslint src` — clean (3 pre-existing warnings in `i18n.tsx` only).
- `npm run build` → `dist/` contains `models/…tar.gz`, `sw.js` precache list contains the vosk chunk, and the worklet file exists at the URL the bundle references.

In the in-app browser (dev server, Chrome engine, no real mic available):
- Deterministic recognition test without a microphone: generate WAV files with Windows TTS via PowerShell (`System.Speech.Synthesis.SpeechSynthesizer.SetOutputToWaveFile`) for "three against seven", "twenty one versus four", "undo", "I rolled a three and a seven"; expose a dev-only `window.__voiceTestFile(url)` in `useVoskListener` (dev build only) that decodes the WAV with `decodeAudioData` and feeds it through the same `acceptWaveformFloat` path; assert via the status pill / DOM that units 3→7 get selected, 21→4, undo closes the calculator, and the table-talk sentence is ignored.
- Toggle on → pill shows download progress → "Listening"; toggle off/on repeatedly → no duplicate recognizers (count `postMessage` handlers / check `model` singleton), no console errors.
- Offline check: DevTools "Offline" after one successful load, reload page, toggle on → model loads without network (proves SW/cache path; if it fails, apply the blob-URL fallback).
- Portrait (`resize_window` mobile): pill and disabled-toggle reason readable.

On the iPhone (user, guided):
- Step 1 spike results (standalone, first launch and relaunch).
- Final: home-screen launch, voice on, say "three against seven" → calculator opens; "undo" → closes; airplane mode → relaunch → voice still works from cache.

## Out of scope

- Ukrainian recognition (user chose English only; adding the 78 MB nano model later is a config + grammar change).
- Push-to-talk, wake words, partial-result UI.
- Capacitor/native wrapper (only if step 1 fails).
