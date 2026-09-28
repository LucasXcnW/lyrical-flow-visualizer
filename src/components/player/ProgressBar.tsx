import { useEffect, useRef, type RefObject } from "react";

import { Button } from "@/components/ui/button";

const FALLBACK_DURATION = 169.53;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

type ProgressBarProps = {
  audioRef: RefObject<HTMLAudioElement | null>;
  onSeek: (time: number) => void;
};

export function ProgressBar({ audioRef, onSeek }: ProgressBarProps) {
  const rangeRef = useRef<HTMLInputElement>(null);
  const elapsedRef = useRef<HTMLSpanElement>(null);
  const remainingRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let frame: number | null = null;

    const paint = () => {
      const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : FALLBACK_DURATION;
      const current = Math.max(0, Math.min(audio.currentTime || 0, duration));
      if (rangeRef.current) {
        rangeRef.current.max = String(duration);
        rangeRef.current.value = String(current);
        rangeRef.current.style.setProperty("--progress", `${(current / duration) * 100}%`);
      }
      if (elapsedRef.current) elapsedRef.current.textContent = formatTime(current);
      if (remainingRef.current) remainingRef.current.textContent = `-${formatTime(Math.max(0, duration - current))}`;
    };

    const tick = () => {
      paint();
      if (!audio.paused && !audio.ended) frame = requestAnimationFrame(tick);
      else frame = null;
    };
    const stop = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      paint();
    };
    const start = () => {
      stop();
      frame = requestAnimationFrame(tick);
    };

    paint();
    if (!audio.paused) start();
    audio.addEventListener("play", start);
    audio.addEventListener("pause", stop);
    audio.addEventListener("ended", stop);
    audio.addEventListener("seeked", paint);
    audio.addEventListener("loadedmetadata", paint);
    audio.addEventListener("durationchange", paint);
    return () => {
      stop();
      audio.removeEventListener("play", start);
      audio.removeEventListener("pause", stop);
      audio.removeEventListener("ended", stop);
      audio.removeEventListener("seeked", paint);
      audio.removeEventListener("loadedmetadata", paint);
      audio.removeEventListener("durationchange", paint);
    };
  }, [audioRef]);

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span ref={elapsedRef} className="w-11 text-right text-xs tabular-nums text-muted-foreground">0:00</span>
      <input
        ref={rangeRef}
        aria-label="Progresso da música"
        type="range"
        min="0"
        max={FALLBACK_DURATION}
        step="0.01"
        defaultValue="0"
        onInput={(event) => onSeek(Number(event.currentTarget.value))}
        className="progress-range min-w-0 flex-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      <span ref={remainingRef} className="w-11 text-xs tabular-nums text-muted-foreground">-{formatTime(FALLBACK_DURATION)}</span>
    </div>
  );
}