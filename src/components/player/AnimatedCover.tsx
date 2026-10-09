import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import "./AnimatedCover.css";

const videoSource = "/media/siga-rota-morph.mp4";
const firstFrame = "/media/siga-rota-morph-first.webp";
const lastFrame = "/media/siga-rota-morph-last.webp";
type Phase = "idle" | "loading" | "playing" | "ended" | "error";

export function AnimatedCover({
  audioRef,
  children,
}: {
  audioRef: RefObject<HTMLAudioElement | null>;
  children: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const finalImageRef = useRef<HTMLImageElement>(null);
  const replayRef = useRef<(() => void) | null>(null);
  const automaticHandledRef = useRef(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [hasVideoFrame, setHasVideoFrame] = useState(false);
  const [lastFrameReady, setLastFrameReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return;
    // A cached SSR image can finish loading before React hydrates its onLoad.
    const finalImage = finalImageRef.current;
    if (finalImage?.complete && finalImage.naturalWidth > 0) setLastFrameReady(true);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let mounted = true;
    let request = 0;
    let active = false;
    let frameCallback: number | null = null;

    const cancelFrame = () => {
      if (frameCallback !== null) video.cancelVideoFrameCallback(frameCallback);
      frameCallback = null;
    };
    const showPoster = () => {
      active = false;
      request += 1;
      cancelFrame();
      video.pause();
      setHasVideoFrame(false);
    };
    const fail = () => {
      if (!mounted) return;
      showPoster();
      setPhase("error");
    };
    const start = () => {
      // Explicit playback also consumes the automatic run. Audio is never touched.
      automaticHandledRef.current = true;
      showPoster();
      const currentRequest = request;
      active = true;
      setPhase("loading");
      try {
        video.muted = true;
        if (video.error) video.load();
        video.currentTime = 0;
        void video.play().catch(() => {
          if (mounted && request === currentRequest) fail();
        });
      } catch {
        fail();
      }
    };
    const onAudioPlaying = () => {
      if (automaticHandledRef.current) return;
      // Consume even when reduced motion prevents autoplay, so toggling the
      // preference or resuming/seeking audio cannot trigger a delayed surprise.
      automaticHandledRef.current = true;
      if (!motion.matches) start();
    };
    const onVideoPlaying = () => {
      if (!active) return;
      setPhase("playing");
      cancelFrame();
      const currentRequest = request;
      const reveal = () => {
        frameCallback = null;
        if (mounted && active && request === currentRequest) setHasVideoFrame(true);
      };
      // Keep the poster covering the decoder until an actual frame is presented.
      if (typeof video.requestVideoFrameCallback === "function") {
        frameCallback = video.requestVideoFrameCallback(reveal);
      } else if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        reveal();
      }
    };
    const onEnded = () => {
      if (!active) return;
      active = false;
      cancelFrame();
      setHasVideoFrame(true);
      setPhase("ended");
      // Do not seek or reload: retain the decoded final frame until its image is ready.
    };
    const onMotionChange = () => {
      if (motion.matches && active) {
        showPoster();
        setPhase("idle");
      }
    };

    replayRef.current = start;
    audio.addEventListener("playing", onAudioPlaying);
    video.addEventListener("playing", onVideoPlaying);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", fail);
    motion.addEventListener("change", onMotionChange);
    return () => {
      mounted = false;
      active = false;
      request += 1;
      replayRef.current = null;
      cancelFrame();
      audio.removeEventListener("playing", onAudioPlaying);
      video.removeEventListener("playing", onVideoPlaying);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", fail);
      motion.removeEventListener("change", onMotionChange);
      video.pause();
    };
  }, [audioRef]);

  const showLastFrame = phase === "ended" && lastFrameReady;
  return (
    <div className="animated-cover" data-animation-state={phase}>
      <div
        className="animated-cover-frame"
        role="img"
        aria-label={
          phase === "ended"
            ? "Símbolo de Segurança do Trabalho em creme e terracota sobre fundo marrom"
            : "Capa de Siga a Rota: seta e título em terracota que se transformam no símbolo de Segurança do Trabalho"
        }
      >
        <div className="animated-cover-media" aria-hidden="true">
          <video
            ref={videoRef}
            src={videoSource}
            poster={firstFrame}
            width={1080}
            height={1080}
            preload="none"
            muted
            playsInline
            controls={false}
            loop={false}
            disablePictureInPicture
            disableRemotePlayback
            tabIndex={-1}
          />
          <img
            src={firstFrame}
            width={1080}
            height={1080}
            alt=""
            fetchPriority="high"
            className="animated-cover-still"
            data-visible={!hasVideoFrame && !showLastFrame}
          />
          <img
            ref={finalImageRef}
            src={lastFrame}
            width={1080}
            height={1080}
            alt=""
            className="animated-cover-still"
            data-visible={showLastFrame}
            onLoad={() => setLastFrameReady(true)}
          />
        </div>
      </div>
      <div className="animated-cover-actions">
        <Button
          type="button"
          variant="ghost"
          className="animated-cover-replay"
          onClick={() => replayRef.current?.()}
          aria-label="Rever animação"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Rever animação
        </Button>
        {children}
      </div>
      <p className="animated-cover-message" aria-live="polite" aria-atomic="true">
        {phase === "error"
          ? "A animação não pôde ser reproduzida. Você pode tentar novamente em Rever animação."
          : ""}
      </p>
    </div>
  );
}
