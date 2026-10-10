import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useCoverTimeline } from "@/hooks/use-cover-timeline";
import { Button } from "@/components/ui/button";
import "./AnimatedCover.css";

const videoSource = "/media/siga-rota-morph.mp4";
const firstFrame = "/media/siga-rota-morph-first.webp";
const lastFrame = "/media/siga-rota-morph-last.webp";

export function AnimatedCover({
  audioRef,
  children,
}: {
  audioRef: RefObject<HTMLAudioElement | null>;
  children: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const finalImageRef = useRef<HTMLImageElement>(null);
  const [allowMotion, setAllowMotion] = useState(false);
  const { phase, hasVideoFrame, reducedMotion } = useCoverTimeline(audioRef, videoRef, allowMotion);
  const [lastFrameReady, setLastFrameReady] = useState(false);

  useEffect(() => {
    // SSR images can finish loading before React hydrates onLoad.
    const image = finalImageRef.current;
    if (image?.complete && image.naturalWidth > 0) setLastFrameReady(true);
  }, []);

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
        {reducedMotion && (
          <Button
            type="button"
            variant="ghost"
            className="mr-auto h-auto min-h-11 min-w-0 shrink px-2 py-2 text-xs leading-snug"
            aria-pressed={allowMotion}
            onClick={() => setAllowMotion((allowed) => !allowed)}
          >
            {allowMotion ? "Desativar animação" : "Ativar animação"}
          </Button>
        )}
        {children}
      </div>
      <p className="animated-cover-message" aria-live="polite" aria-atomic="true">
        {phase === "error"
          ? "A animação não pôde ser reproduzida. Ao pausar e reproduzir a música, tentaremos novamente."
          : reducedMotion && !allowMotion
            ? "Movimento reduzido: capa estática. Você pode ativar a animação."
            : ""}
      </p>
    </div>
  );
}
