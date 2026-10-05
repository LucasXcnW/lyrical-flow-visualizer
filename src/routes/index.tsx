import { createFileRoute } from "@tanstack/react-router";
import { Music2, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import songAsset from "@/assets/siga-a-rota.mp3.asset.json";
import coverAsset from "@/assets/siga-a-rota-capa.jpg.asset.json";
import brandAsset from "@/assets/seguranca-do-trabalho-filled.png.asset.json";
import { ProgressBar } from "@/components/player/ProgressBar";
import { Button } from "@/components/ui/button";

const lyrics = [
  { start: 0, text: "♪" },
  { start: 11.7, text: "Olha a fumaça, não perca a calma" },
  { start: 15.2, text: "O fogo avança, mas não se assusta" },
  { start: 18.3, text: "Com esse perigo, sabe o que fazer" },
  { start: 21.2, text: "Siga a rota sem correr" },
  { start: 24.1, text: "Eu fico sem saber por onde ir" },
  { start: 27.2, text: "A placa verde vai me guiar" },
  { start: 30.4, text: "Guiar" },
  { start: 31.5, text: "Então, me ajude a avisar" },
  { start: 34.7, text: "A brigada toda no cento e noventa e três" },
  { start: 37.4, text: "Então, me ajude a acionar" },
  { start: 40.3, text: "O socorro no cento e noventa e três, iê" },
  { start: 44.0, text: "Di-di-di-di-diê" },
  { start: 46.6, text: "Di-di-di-di-diê-iê-iê" },
  { start: 49.3, text: "Di-di-di-di-diê" },
  { start: 52.4, text: "Fogo no papel, é Classe A" },
  { start: 55.4, text: "Com a água você vai apagar" },
  { start: 57.6, text: "Líquido inflamável, tome cuidado" },
  { start: 62.9, text: "Pó químico é o mais indicado" },
  { start: 65.3, text: "Então, me ajude a segurar" },
  { start: 68.2, text: "Essa barra de apagar e saber o que fazer" },
  { start: 73.9, text: "Então, me ajude a avisar" },
  { start: 76.4, text: "A brigada toda no cento e noventa e três" },
  { start: 79.0, text: "Então, me ajude a acionar" },
  { start: 82.0, text: "O socorro no cento e noventa e três, iê" },
  { start: 85.5, text: "Di-di-di-di-diê" },
  { start: 88.2, text: "Di-di-di-di-diê-iê-iê" },
  { start: 90.9, text: "Di-di-di-di-diê" },
  { start: 94.2, text: "♪" },
  { start: 115.1, text: "No quadro de energia, perigo no ar" },
  { start: 118.6, text: "Classe C tem que usar CO2 para apagar" },
  { start: 125.1, text: "Sem água por perto, choque vai dar" },
  { start: 128.2, text: "Aprenda essa regra para se salvar" },
  { start: 130.4, text: "Olha a rota pintada, não pare de andar" },
  { start: 133.3, text: "O ponto de encontro é o lugar pra ficar" },
  { start: 135.9, text: "Então, me ajude a avisar" },
  { start: 138.9, text: "A brigada toda no cento e noventa e três" },
  { start: 141.3, text: "Então, me ajude a acionar" },
  { start: 144.0, text: "O socorro no cento e noventa e três, iê" },
  { start: 147.8, text: "Di-di-di-di-diê" },
  { start: 150.5, text: "Di-di-di-di-diê-iê-iê" },
  { start: 153.2, text: "Di-di-di-di-diê" },
  { start: 159.6, text: "Segurança sempre em primeiro lugar" },
];


type SceneMode = "default" | "smoke" | "exit" | "route" | "extinguisher" | "electrical" | "assembly";

const sceneModes: Record<number, SceneMode> = {
  1: "smoke",
  2: "smoke",
  3: "route",
  4: "route",
  5: "route",
  6: "exit",
  7: "exit",
  15: "extinguisher",
  16: "extinguisher",
  17: "extinguisher",
  18: "extinguisher",
  19: "extinguisher",
  20: "extinguisher",
  29: "electrical",
  30: "electrical",
  31: "electrical",
  32: "electrical",
  33: "route",
  34: "assembly",
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Siga a Rota — Lucas Tavares, Gabriel Massal e Vinícius Wendel" },
      { name: "description", content: "Ouça Siga a Rota, de Lucas Tavares, Gabriel Massal e Vinícius Wendel, com a letra sincronizada." },
      { property: "og:title", content: "Siga a Rota — Lucas Tavares, Gabriel Massal e Vinícius Wendel" },
      { property: "og:description", content: "Ouça Siga a Rota e acompanhe a letra original sincronizada." },
      { property: "og:type", content: "music.song" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lyricsViewportRef = useRef<HTMLDivElement>(null);
  const lyricRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const hasRevealedLyricsRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const manualScrollUntilRef = useRef(0);
  const resumeScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeIndexRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const updateActiveLine = (time: number) => {
    // The audio clock is the single source of truth. Visual transitions must never
    // advance or delay lyric timing.
    const lyricTime = Math.max(0, time);
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (lyricTime >= lyrics[i]!.start) {
        if (activeIndexRef.current !== i) {
          activeIndexRef.current = i;
          setActiveIndex(i);
        }
        return;
      }
    }
  };

  const centerActiveLine = (index: number) => {
    if (Date.now() < manualScrollUntilRef.current) return;
    const viewport = lyricsViewportRef.current;
    const line = lyricRefs.current[index];
    if (!viewport || !line) return;
    const lineRect = line.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const offset = lineRect.top + lineRect.height / 2 - viewportRect.top - viewportRect.height / 2;
    const target = Math.max(0, Math.min(viewport.scrollHeight - viewport.clientHeight, viewport.scrollTop + offset));
    if (Math.abs(target - viewport.scrollTop) > 8) {
      viewport.scrollTo({ top: target, behavior: "smooth" });
    }
    if (index > 0 && !hasRevealedLyricsRef.current && window.innerWidth < 1024) {
      const dockTop = document.querySelector(".player-dock")?.getBoundingClientRect().top ?? window.innerHeight;
      if (viewportRect.bottom > dockTop - 12) {
        window.scrollBy({ top: viewportRect.top - 20, behavior: "smooth" });
      }
      hasRevealedLyricsRef.current = true;
    }
  };

  useEffect(() => {
    centerActiveLine(activeIndex);
  }, [activeIndex]);

  useEffect(() => {
    const viewport = lyricsViewportRef.current;
    if (!viewport) return;
    const suspendAutoScroll = () => {
      manualScrollUntilRef.current = Date.now() + 3500;
      if (resumeScrollTimerRef.current !== null) clearTimeout(resumeScrollTimerRef.current);
      resumeScrollTimerRef.current = setTimeout(() => {
        manualScrollUntilRef.current = 0;
        centerActiveLine(activeIndexRef.current);
        resumeScrollTimerRef.current = null;
      }, 3500);
    };
    viewport.addEventListener("wheel", suspendAutoScroll, { passive: true });
    viewport.addEventListener("touchmove", suspendAutoScroll, { passive: true });
    viewport.addEventListener("pointerdown", suspendAutoScroll, { passive: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) suspendAutoScroll();
    };
    viewport.addEventListener("keydown", onKeyDown);
    return () => {
      viewport.removeEventListener("wheel", suspendAutoScroll);
      viewport.removeEventListener("touchmove", suspendAutoScroll);
      viewport.removeEventListener("pointerdown", suspendAutoScroll);
      viewport.removeEventListener("keydown", onKeyDown);
      if (resumeScrollTimerRef.current !== null) clearTimeout(resumeScrollTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const audio = audioRef.current;
    if (!audio) return;

    const followAudio = () => {
      if (audio.paused || audio.ended) return;
      const currentTime = audio.currentTime;
      updateActiveLine(currentTime);
      // One shared audio clock drives both lyrics and the progress bar.
      audio.dispatchEvent(new CustomEvent("lyric-clock", {
        detail: { currentTime },
      }));
      animationFrameRef.current = window.requestAnimationFrame(followAudio);
    };

    animationFrameRef.current = window.requestAnimationFrame(followAudio);
    return () => {
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    };
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      setPlaybackError(null);
      audio.muted = muted;
      await audio.play();
    } catch {
      setPlaybackError(
        "O navegador bloqueou o som aqui. Abra a página em uma nova aba para ouvir a música.",
      );
    }
  };

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 169.53;
    audio.currentTime = Math.max(0, Math.min(duration, time));
    updateActiveLine(audio.currentTime);
  };

  return (
    <main className="safety-scene relative min-h-dvh overflow-x-clip bg-background text-foreground" data-scene={sceneModes[activeIndex] ?? "default"}>
      <div className="player-content relative z-10 mx-auto flex min-h-dvh max-w-[1440px] flex-col px-4 pt-4 sm:px-8 sm:pt-6 lg:px-14 lg:pb-32">
        <header className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-border pb-4 sm:pb-5">
          <span className="size-9 shrink-0" aria-hidden="true"><img src={brandAsset.url} alt="" className="size-full object-contain" /></span>
          <span className="min-w-0 text-xs font-bold uppercase leading-tight tracking-[0.12em] sm:text-sm sm:tracking-[0.16em]">
            <span className="block sm:inline">Técnico de Segurança do Trabalho</span>
            <span className="mt-0.5 block sm:ml-2 sm:mt-0 sm:inline">— 30</span>
          </span>
        </header>

        <section className="grid flex-1 content-start items-center gap-6 py-6 sm:gap-14 sm:py-10 lg:grid-cols-[minmax(300px,0.85fr)_minmax(390px,1.15fr)] lg:gap-20 lg:pt-16">
          <div className="mx-auto w-full min-w-0 max-w-[min(100%,38dvh,340px)] sm:max-w-[440px] lg:col-start-1 lg:row-start-1 lg:mx-0">
            <div className={`cover-shadow cover-stage relative aspect-square overflow-hidden rounded-md bg-card ${isPlaying ? "is-playing" : ""}`}>
              <audio
                ref={audioRef}
                src={songAsset.url}
                preload="auto"
                playsInline
                controls={false}
                 onPlay={(event) => { updateActiveLine(event.currentTarget.currentTime); setIsPlaying(true); }}
                 onPause={(event) => { updateActiveLine(event.currentTarget.currentTime); setIsPlaying(false); }}
                 onEnded={(event) => { updateActiveLine(event.currentTarget.currentTime); setIsPlaying(false); }}
                 onTimeUpdate={(event) => updateActiveLine(event.currentTarget.currentTime)}
                 onSeeked={(event) => updateActiveLine(event.currentTarget.currentTime)}
                aria-label="Áudio de Siga a Rota"
              />
              <img src={coverAsset.url} alt="Capa da música Siga a Rota" className="cover-art size-full object-cover" />
              <Button
                type="button"
                size="player"
                onClick={togglePlayback}
                className="absolute bottom-5 right-5 shadow-xl"
                aria-label={isPlaying ? "Pausar" : "Reproduzir"}
              >
                {isPlaying ? <Pause className="size-6 fill-current" /> : <Play className="ml-0.5 size-6 fill-current" />}
              </Button>
            </div>
             <div className="mt-4 flex items-end justify-between gap-4 sm:mt-6">
               <div className="min-w-0">
                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary"><Music2 className="size-4" /> Música</p>
                 <h1 className="font-display text-3xl font-bold sm:text-5xl">Siga a Rota</h1>
                 <p className="mt-2 text-sm font-semibold leading-snug text-foreground sm:mt-3 sm:leading-relaxed">Lucas Tavares · Gabriel Massal · Vinícius Wendel</p>
                 <p className="mt-1 text-xs leading-snug text-muted-foreground sm:mt-2 sm:text-sm">Canção educativa · Prevenção e segurança</p>
              </div>
            </div>
          </div>

           <section className="order-3 min-w-0 pb-8 lg:order-none lg:col-start-2 lg:row-start-1 lg:border-l lg:border-border lg:pb-0 lg:pl-16" aria-labelledby="lyrics-title">
             <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:mb-6">
               <div className="min-w-0">
                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary"><Music2 className="size-4" /> Siga a Rota</p>
                 <h2 id="lyrics-title" className="font-display text-2xl font-bold sm:text-3xl">Letra</h2>
              </div>
              <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span className={isPlaying ? "size-2 animate-pulse rounded-full bg-primary" : "size-2 rounded-full bg-muted-foreground"} />
                {isPlaying ? "Ao vivo" : "Pausado"}
              </span>
            </div>
              <div ref={lyricsViewportRef} className="lyrics-mask relative h-[clamp(250px,38dvh,420px)] overflow-y-auto overscroll-contain scroll-smooth pr-3 sm:h-[55vh] sm:min-h-96 sm:max-h-[620px] sm:pr-4">
                <div className="flex flex-col gap-4 py-[19dvh] sm:gap-5 sm:py-48">
                {lyrics.map((line, index) => (
                   <Button
                    key={`${line.start}-${line.text}`}
                    ref={(element) => { lyricRefs.current[index] = element; }}
                    type="button"
                     variant="ghost"
                    onClick={() => {
                      seekTo(line.start);
                      if (audioRef.current?.paused) void togglePlayback();
                    }}
                      aria-current={index === activeIndex ? "true" : undefined}
                      className={`lyric-line relative min-h-11 w-full shrink-0 justify-start whitespace-normal rounded-none bg-transparent p-0 text-left font-display text-lg font-bold leading-snug hover:bg-transparent sm:h-auto sm:text-3xl ${
                      index === activeIndex ? "is-active" : index < activeIndex ? "is-past" : ""
                    }`}
                  >
                    {line.text}
                   </Button>
                ))}
              </div>
            </div>
          </section>
          <div className="safety-stage order-2 lg:order-none lg:col-span-2 lg:row-start-2" aria-hidden="true">
            <div className="safety-tape safety-tape-left" />
            <div className="safety-tape safety-tape-right" />
            <div className="safety-smoke safety-smoke-one" />
            <div className="safety-smoke safety-smoke-two" />
            <div className="emergency-sign emergency-sign-top">← SAÍDA</div>
            <div className="emergency-sign emergency-sign-side">SAÍDA →</div>
            <div className="route-glow route-glow-one" />
            <div className="route-glow route-glow-two" />
            <div className="safety-extinguisher">
              <span className="safety-extinguisher-body">EXTINTOR</span>
              <span className="safety-extinguisher-tag">A · B</span>
            </div>
            <div className="electrical-warning">
              <span className="electrical-warning-symbol">⚡</span>
              <span>RISCO ELÉTRICO</span>
            </div>
            <div className="assembly-point">
              <span className="assembly-point-icon">●</span>
              <span>PONTO DE ENCONTRO</span>
            </div>
          </div>
        </section>
      </div>

       <aside className="player-dock fixed inset-x-0 bottom-0 z-20 border-t border-border bg-player/95 px-4 pt-2 shadow-2xl backdrop-blur-xl sm:px-8 sm:pt-4">
         <div className="mx-auto flex max-w-[1500px] flex-col gap-1 sm:gap-3">
          {playbackError ? (
            <p role="alert" className="rounded-md bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              {playbackError}
            </p>
          ) : null}
           <p className="truncate text-xs font-bold sm:hidden">Siga a Rota <span className="font-normal text-muted-foreground">· Lucas Tavares · Gabriel Massal · Vinícius Wendel</span></p>
            <ProgressBar audioRef={audioRef} onSeek={seekTo} />
           <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-bold">Siga a Rota</p>
               <p className="truncate text-xs text-muted-foreground">Lucas Tavares · Gabriel Massal · Vinícius Wendel</p>
            </div>
            <div className="col-start-2 flex items-center gap-2">
               <Button type="button" variant="ghost" size="icon" onClick={() => seekTo((audioRef.current?.currentTime ?? 0) - 10)} aria-label="Voltar 10 segundos">
                <RotateCcw className="size-5" />
              </Button>
              <Button type="button" size="player" onClick={togglePlayback} aria-label={isPlaying ? "Pausar" : "Reproduzir"}>
                {isPlaying ? <Pause className="size-6 fill-current" /> : <Play className="ml-0.5 size-6 fill-current" />}
              </Button>
               <Button type="button" variant="ghost" size="icon" onClick={() => seekTo((audioRef.current?.currentTime ?? 0) + 10)} aria-label="Avançar 10 segundos">
                <RotateCw className="size-5" />
              </Button>
            </div>
            <div className="justify-self-end">
              <Button type="button" variant="ghost" size="icon" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Ativar som" : "Silenciar"}>
                {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
