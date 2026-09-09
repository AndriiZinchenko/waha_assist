/**
 * Thin wrapper over the browser's Web Speech API. TypeScript's DOM lib
 * ships the result types but not the recognizer constructor itself, and
 * Safari still exposes it only under the `webkit` prefix — so both are
 * declared here, minimally, and looked up at call time.
 */
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult:
    | ((event: { resultIndex: number; results: SpeechRecognitionResultList }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognizer(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const SPEECH_SUPPORTED = getRecognizer() !== null;

/** Errors after which restarting would just fail again (or re-prompt). */
const FATAL_ERRORS = new Set(["not-allowed", "service-not-allowed", "audio-capture"]);

export interface ListenHandlers {
  /** Every alternative the engine offered for one finished utterance,
   * best first. Fires once per utterance for as long as listening runs. */
  onTranscripts: (alternatives: string[]) => void;
  /** Listening stopped for good and won't restart by itself. */
  onFatal: (reason: string) => void;
}

/**
 * Listen hands-free until the returned stop function is called. Browsers
 * end a recognition session on their own after a pause or a timeout (and
 * iOS Safari doesn't really do `continuous` at all), so every natural end
 * restarts a fresh session — a permission denial or missing microphone is
 * the only thing that stops the loop.
 */
export function startListening(lang: string, handlers: ListenHandlers): () => void {
  const Ctor = getRecognizer();
  if (!Ctor) {
    handlers.onFatal("unsupported");
    return () => {};
  }

  let stopped = false;
  let current: SpeechRecognitionLike | null = null;
  let restartTimer: number | null = null;

  function spawn() {
    if (stopped) return;
    const recognition = new Ctor!();
    current = recognition;
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    let fatal: string | null = null;
    let sawError = false;

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue;
        handlers.onTranscripts(Array.from(result, (alt) => alt.transcript));
      }
    };
    recognition.onerror = (event) => {
      if (FATAL_ERRORS.has(event.error)) fatal = event.error;
      // "no-speech" / "aborted" / "network" are ordinary — just restart.
      else if (event.error !== "no-speech" && event.error !== "aborted") {
        sawError = true;
      }
    };
    recognition.onend = () => {
      if (current === recognition) current = null;
      if (stopped) return;
      if (fatal) {
        stopped = true;
        handlers.onFatal(fatal);
        return;
      }
      // Back off a little after a transient error so a flaky network
      // doesn't turn into a tight restart loop.
      restartTimer = window.setTimeout(spawn, sawError ? 1500 : 250);
    };

    try {
      recognition.start();
    } catch {
      // start() throws if a session is somehow still open; try again shortly.
      restartTimer = window.setTimeout(spawn, 500);
    }
  }

  spawn();

  return () => {
    stopped = true;
    if (restartTimer !== null) window.clearTimeout(restartTimer);
    current?.abort();
    current = null;
  };
}
