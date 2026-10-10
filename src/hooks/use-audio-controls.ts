import { useCallback, useEffect, useRef, type RefObject } from "react";

export const COVER_PLAYBACK_START = "player-cover-start";
type PlayOrigin = "button" | "loop" | "lyrics";

/** One intent per play request; seeking/buffering events cannot create an intent. */
export function useAudioControls(
  audioRef: RefObject<HTMLAudioElement | null>,
  onError: (message: string | null) => void,
) {
  const requestRef = useRef(0);
  const pendingRef = useRef<{ id: number; origin: PlayOrigin } | null>(null);
  const manualEndRef = useRef(false);

  const cancelRequest = useCallback(() => {
    requestRef.current += 1;
    pendingRef.current = null;
  }, []);

  const play = useCallback(
    async (origin: PlayOrigin) => {
      const audio = audioRef.current;
      if (!audio || pendingRef.current || !audio.paused) return;
      const id = ++requestRef.current;
      pendingRef.current = { id, origin };
      onError(null);
      try {
        if (audio.ended || origin === "loop") {
          manualEndRef.current = false;
          audio.currentTime = 0;
        }
        await audio.play();
      } catch (error) {
        if (requestRef.current !== id) return;
        pendingRef.current = null;
        onError(
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "O navegador bloqueou a reprodução. Toque novamente em Reproduzir."
            : "Não foi possível reproduzir a música. Verifique o arquivo ou a conexão e tente novamente.",
        );
      }
    },
    [audioRef, onError],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlaying = () => {
      const intent = pendingRef.current;
      if (audio.paused || !intent || intent.id !== requestRef.current) return;
      pendingRef.current = null;
      if (intent.origin !== "lyrics") {
        audio.dispatchEvent(new CustomEvent(COVER_PLAYBACK_START, { detail: intent.origin }));
      }
    };
    const onEnded = () => {
      // A slider jump directly to the end is a navigation action, not a loop.
      if (manualEndRef.current) {
        manualEndRef.current = false;
        return;
      }
      void play("loop");
    };
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", cancelRequest);
    audio.addEventListener("error", cancelRequest);
    audio.addEventListener("ended", onEnded);
    return () => {
      cancelRequest();
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", cancelRequest);
      audio.removeEventListener("error", cancelRequest);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audioRef, cancelRequest, play]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (pendingRef.current || !audio.paused) {
      cancelRequest();
      audio.pause();
    } else {
      void play("button");
    }
  }, [audioRef, cancelRequest, play]);

  const markManualSeek = useCallback(
    (target: number, duration: number) => {
      // The existing range has a 0.01-second step, so its last selectable tick
      // can be slightly below the decoded duration.
      manualEndRef.current = Number.isFinite(duration) && target >= duration - 0.01;
      if (pendingRef.current?.origin === "loop") cancelRequest();
    },
    [cancelRequest],
  );

  const playFromLyrics = useCallback(() => void play("lyrics"), [play]);
  return { togglePlayback, playFromLyrics, markManualSeek };
}
