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

    const paint = (currentTime = audio.currentTime) => {
      const duration =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : FALLBACK_DURATION;
      const current = Math.max(0, Math.min(currentTime || 0, duration));

      if (rangeRef.current) {
        rangeRef.current.max = String(duration);
        rangeRef.current.value = String(current);
        rangeRef.current.style.setProperty("--progress", `${(current / duration) * 100}%`);
      }
      if (elapsedRef.current) elapsedRef.current.textContent = formatTime(current);
      if (remainingRef.current) {
        remainingRef.current.textContent = `-${formatTime(Math.max(0, duration - current))}`;
      }
    };

    const onLyricClock = (event: Event) => {
      const currentTime = (event as CustomEvent<{ currentTime: number }>).detail?.currentTime;
      paint(Number.isFinite(currentTime) ? currentTime : audio.currentTime);
    };
    const onSeeked = () => paint();
    const onMetadata = () => paint();

    paint();
    audio.addEventListener("lyric-clock", onLyricClock);
    audio.addEventListener("seeked", onSeeked);
    audio.addEventListener("loadedmetadata", onMetadata);
    audio.addEventListener("durationchange", onMetadata);

    return () => {
      audio.removeEventListener("lyric-clock", onLyricClock);
      audio.removeEventListener("seeked", onSeeked);
      audio.removeEventListener("loadedmetadata", onMetadata);
      audio.removeEventListener("durationchange", onMetadata);
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