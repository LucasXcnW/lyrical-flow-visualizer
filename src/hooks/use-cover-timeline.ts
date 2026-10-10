import { useEffect, useState, type RefObject } from "react";

const START_TIME = 12;
const CLIP_DURATION = 6;
type Phase = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

/** Read the audio clock; never derive the cover's position from a click or timer. */
export function useCoverTimeline(
  audioRef: RefObject<HTMLAudioElement | null>,
  videoRef: RefObject<HTMLVideoElement | null>,
  allowMotion: boolean,
) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [hasVideoFrame, setHasVideoFrame] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio || !video) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let mounted = true;
    let running = !audio.paused && !audio.seeking && audio.readyState >= 3;
    let requested = video.readyState > 0 && !video.error;
    let failed = false;
    let pendingPlay = false;
    let request = 0;
    let lastCorrectionAudioTime = -Infinity;
    let currentPhase: Phase | undefined;
    let visible = false;

    const updatePhase = (next: Phase) => {
      if (currentPhase !== next) {
        currentPhase = next;
        setPhase(next);
      }
    };
    const showVideo = (next: boolean) => {
      if (visible !== next) {
        visible = next;
        setHasVideoFrame(next);
      }
    };
    const pause = () => {
      if (!video.paused || pendingPlay) {
        request += 1;
        pendingPlay = false;
        video.pause();
      }
    };
    const fail = () => {
      if (!mounted) return;
      failed = true;
      pause();
      showVideo(false);
      updatePhase("error");
    };
    const load = () => {
      if (requested) return;
      requested = true;
      video.preload = "auto";
      video.load();
    };

    const sync = (force = false) => {
      if (!mounted) return;
      if (motion.matches && !allowMotion) {
        pause();
        showVideo(false);
        updatePhase("idle");
        return;
      }
      const duration = Number.isFinite(video.duration) ? video.duration : CLIP_DURATION;
      const target = Math.max(0, Math.min(audio.currentTime - START_TIME, duration));
      const shouldPlay = running && !audio.paused && !audio.seeking && !audio.ended;

      if (audio.currentTime < START_TIME) {
        pause();
        showVideo(false);
        updatePhase(failed ? "error" : "idle");
        if (video.readyState > 0 && video.currentTime !== 0) video.currentTime = 0;
        // Warm the decoder during the introduction, without moving the cover.
        if (shouldPlay && !failed) load();
        return;
      }
      if (failed) return;
      load();
      if (video.readyState === 0) {
        updatePhase(target >= duration ? "ended" : "loading");
        return;
      }
      const atEnd = target >= duration;
      if (!shouldPlay || atEnd) pause();
      // A decoder can end slightly ahead of the audio. Never call play() on
      // that ended clip: browsers would rewind it and produce an extra run.
      if (video.ended && !force && duration - target < 0.15) {
        showVideo(true);
        updatePhase("ended");
        return;
      }
      // Native playback is smooth; audio time corrects drift, seeks and buffering.
      const tolerance = force || !shouldPlay ? 0.02 : 0.12;
      // Allow decoding to settle between drift corrections under CPU load.
      // This limit also uses audio time; explicit seeks/pauses bypass it.
      const canCorrect =
        force ||
        !shouldPlay ||
        atEnd ||
        Math.abs(audio.currentTime - lastCorrectionAudioTime) >= 0.5;
      if (canCorrect && !video.seeking && Math.abs(video.currentTime - target) > tolerance) {
        video.currentTime = target;
        lastCorrectionAudioTime = audio.currentTime;
      }
      if (!video.seeking && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        showVideo(true);
      }
      if (atEnd) {
        updatePhase("ended");
        return;
      }
      if (!shouldPlay) {
        updatePhase("paused");
        return;
      }
      if (!video.paused) {
        updatePhase(
          video.seeking || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
            ? "loading"
            : "playing",
        );
      } else if (!pendingPlay) {
        // Queue playback even while a seek is decoding. Waiting for a perfect
        // match here can starve playback as the audio continues advancing.
        pendingPlay = true;
        const id = ++request;
        updatePhase("loading");
        video.muted = true;
        video.playbackRate = audio.playbackRate;
        try {
          void video.play().then(
            () => {
              if (!mounted || id !== request) return;
              pendingPlay = false;
              sync();
            },
            () => {
              if (mounted && id === request) fail();
            },
          );
        } catch {
          fail();
        }
      }
    };
    const onPlaying = () => {
      running = true;
      if (failed) {
        failed = false;
        requested = false;
      }
      sync(true);
    };
    const onStop = () => {
      running = false;
      pause();
      sync(true);
    };
    const onSeeking = () => {
      pause();
      sync(true);
    };
    const onSeeked = () => {
      running = !audio.paused && !audio.ended && audio.readyState >= 3;
      sync(true);
    };
    const onClock = () => sync();
    const onRate = () => {
      video.playbackRate = audio.playbackRate;
      sync(true);
    };
    const onMotion = () => {
      setReducedMotion(motion.matches);
      sync(true);
    };
    const audioEvents: Array<[string, () => void]> = [
      ["playing", onPlaying],
      ["pause", onStop],
      ["waiting", onStop],
      ["ended", onStop],
      ["error", onStop],
      ["seeking", onSeeking],
      ["seeked", onSeeked],
      ["timeupdate", onClock],
      ["lyric-clock", onClock],
      ["ratechange", onRate],
    ];
    const videoEvents = ["loadedmetadata", "loadeddata", "canplay", "seeked", "playing", "ended"];
    audioEvents.forEach(([event, listener]) => audio.addEventListener(event, listener));
    videoEvents.forEach((event) => video.addEventListener(event, onClock));
    video.addEventListener("error", fail);
    motion.addEventListener("change", onMotion);
    setHasVideoFrame(false);
    onMotion();
    return () => {
      mounted = false;
      request += 1;
      audioEvents.forEach(([event, listener]) => audio.removeEventListener(event, listener));
      videoEvents.forEach((event) => video.removeEventListener(event, onClock));
      video.removeEventListener("error", fail);
      motion.removeEventListener("change", onMotion);
      video.pause();
    };
  }, [audioRef, videoRef, allowMotion]);

  return { phase, hasVideoFrame, reducedMotion };
}
