import { createFileRoute } from "@tanstack/react-router";
import { Music2, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { siSpotify } from "simple-icons";

import songAsset from "@/assets/siga-a-rota.mp3.asset.json";
import coverAsset from "@/assets/siga-a-rota-capa.jpg.asset.json";
import brandAsset from "@/assets/seguranca-do-trabalho-filled.png.asset.json";
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

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

function Index() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lyricsViewportRef = useRef<HTMLDivElement>(null);
  const lyricRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(169.53);
  const [muted, setMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const activeIndex = (() => {
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].start) return i;
    }
    return -1;
  })();

  useEffect(() => {
    if (activeIndex < 0) return;
    const viewport = lyricsViewportRef.current;
    const line = lyricRefs.current[activeIndex];
    if (!viewport || !line) return;
    const lineTop = line.getBoundingClientRect().top;
    const viewportTop = viewport.getBoundingClientRect().top;
    viewport.scrollTo({ top: viewport.scrollTop + lineTop - viewportTop - viewport.clientHeight / 2 + line.clientHeight / 2, behavior: "smooth" });
  }, [activeIndex]);

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
    audio.currentTime = Math.max(0, Math.min(duration, time));
    setCurrentTime(audio.currentTime);
  };

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh max-w-[1440px] flex-col px-5 pb-40 pt-6 sm:px-8 lg:px-14 lg:pb-32">
        <header className="flex items-center gap-3 border-b border-border pb-5">
          <span className="size-9 shrink-0" aria-hidden="true"><img src={brandAsset.url} alt="" className="size-full object-contain" /></span>
          <span className="truncate text-sm font-bold uppercase tracking-[0.16em]">Rota Sessions</span>
        </header>

        <section className="grid flex-1 content-start items-center gap-9 py-10 sm:gap-14 lg:grid-cols-[minmax(300px,0.85fr)_minmax(390px,1.15fr)] lg:gap-20 lg:pt-16">
          <div className="mx-auto w-full max-w-[300px] sm:max-w-[440px] lg:mx-0">
            <div className="cover-shadow relative aspect-square overflow-hidden rounded-md bg-card">
              <audio
                ref={audioRef}
                src={songAsset.url}
                preload="auto"
                playsInline
                controls={false}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
                aria-label="Áudio de Siga a Rota"
              />
              <img src={coverAsset.url} alt="Capa da música Siga a Rota" className="size-full object-cover" />
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
            <div className="mt-6 flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary"><Music2 className="size-4" /> Música</p>
                <h1 className="font-display text-4xl font-bold sm:text-5xl">Siga a Rota</h1>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-foreground">Lucas Tavares · Gabriel Massal · Vinícius Wendel</p>
                <p className="mt-2 text-sm text-muted-foreground">Canção educativa · Prevenção e segurança</p>
                <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><svg viewBox="0 0 24 24" className="size-5 text-primary" fill="currentColor" role="img" aria-label="Spotify"><path d={siSpotify.path} /></svg> Player inspirado no Spotify</p>
              </div>
            </div>
          </div>

          <section className="min-w-0 pb-8 lg:border-l lg:border-border lg:pb-0 lg:pl-16" aria-labelledby="lyrics-title">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary"><Music2 className="size-4" /> Siga a Rota</p>
                <h2 id="lyrics-title" className="font-display text-3xl font-bold">Letra</h2>
              </div>
              <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span className={isPlaying ? "size-2 animate-pulse rounded-full bg-primary" : "size-2 rounded-full bg-muted-foreground"} />
                {isPlaying ? "Ao vivo" : "Pausado"}
              </span>
            </div>
             <div ref={lyricsViewportRef} className="lyrics-mask relative h-72 overflow-y-auto scroll-smooth pr-4 sm:h-[55vh] sm:min-h-96 sm:max-h-[620px]">
               <div className="flex flex-col gap-5 py-28 sm:py-48">
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
                     className={`lyric-line h-auto w-full shrink-0 justify-start whitespace-normal rounded-none bg-transparent p-0 text-left font-display text-xl font-bold leading-snug hover:bg-transparent sm:text-3xl ${
                      index === activeIndex ? "is-active" : index < activeIndex ? "is-past" : ""
                    }`}
                  >
                    {line.text}
                   </Button>
                ))}
              </div>
            </div>
          </section>
        </section>
      </div>

      <aside className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-player/95 px-4 py-4 shadow-2xl backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3">
          {playbackError ? (
            <p role="alert" className="rounded-md bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              {playbackError}
            </p>
          ) : null}
          <div className="flex items-center gap-3">
            <span className="w-11 text-right text-xs tabular-nums text-muted-foreground">{formatTime(currentTime)}</span>
            <input
              aria-label="Progresso da música"
              type="range"
              min="0"
               max={duration || 169.53}
              step="0.1"
              value={currentTime}
              onChange={(event) => seekTo(Number(event.target.value))}
              className="progress-range min-w-0 flex-1"
               style={{ "--progress": `${(currentTime / (duration || 169.53)) * 100}%` } as React.CSSProperties}
            />
            <span className="w-11 text-xs tabular-nums text-muted-foreground">{formatTime(duration)}</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-bold">Siga a Rota</p>
               <p className="truncate text-xs text-muted-foreground">Lucas Tavares · Gabriel Massal · Vinícius Wendel</p>
            </div>
            <div className="col-start-2 flex items-center gap-2">
              <Button type="button" variant="ghost" size="icon" onClick={() => seekTo(currentTime - 10)} aria-label="Voltar 10 segundos">
                <RotateCcw className="size-5" />
              </Button>
              <Button type="button" size="player" onClick={togglePlayback} aria-label={isPlaying ? "Pausar" : "Reproduzir"}>
                {isPlaying ? <Pause className="size-6 fill-current" /> : <Play className="ml-0.5 size-6 fill-current" />}
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => seekTo(currentTime + 10)} aria-label="Avançar 10 segundos">
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
