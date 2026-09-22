import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import songAsset from "@/assets/siga-a-rota.mp3.asset.json";
import coverAsset from "@/assets/siga-a-rota-capa.jpg.asset.json";
import { Button } from "@/components/ui/button";

const lyrics = [
  { start: 0, end: 11.79, text: "♪" },
  { start: 11.79, end: 16.79, text: "Olha a fumaça, não perca a calma" },
  { start: 16.79, end: 23.79, text: "O fogo avança, saiba o que fazer" },
  { start: 23.79, end: 27.8, text: "Siga a rota sem correr" },
  { start: 27.8, end: 31.79, text: "Se eu fico sem saber por onde ir" },
  { start: 31.79, end: 37.79, text: "A placa verde vai me guiar, guiar" },
  { start: 37.79, end: 45.8, text: "Então me ajude a cantar" },
  { start: 45.8, end: 54.38, text: "Brigada, estou no cento e noventa e três" },
  { start: 54.38, end: 61.38, text: "Pense: a água você vai apagar?" },
  { start: 61.38, end: 68.05, text: "Líquido inflamável, tome cuidado" },
  { start: 68.05, end: 73.05, text: "O extintor mais indicado" },
  { start: 73.05, end: 80.05, text: "Então me ajude a segurar" },
  { start: 80.05, end: 86.05, text: "Essa barra e apagar, é saber o que fazer" },
  { start: 86.05, end: 97.05, text: "Você tem que usar CO₂ para apagar" },
  { start: 97.05, end: 123.27, text: "♪ Siga a rota, siga em frente ♪" },
  { start: 123.27, end: 130.61, text: "Água por perto, choque vai dar" },
  { start: 130.61, end: 137.5, text: "Aprenda essa regra para se salvar" },
  { start: 137.5, end: 147, text: "Olha a rota pintada, não pare" },
  { start: 147, end: 174, text: "♪ Siga a rota ♪" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Siga a Rota — Player com letra" },
      { name: "description", content: "Ouça Siga a Rota e acompanhe a letra sincronizada em tempo real." },
      { property: "og:title", content: "Siga a Rota — Player com letra" },
      { property: "og:description", content: "Uma experiência musical interativa com letra sincronizada." },
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
  const lyricRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(174);
  const [muted, setMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const activeIndex = lyrics.findIndex(
    (line) => currentTime >= line.start && currentTime < line.end,
  );

  useEffect(() => {
    if (activeIndex < 0) return;
    lyricRefs.current[activeIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex]);

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
      <div className="mx-auto flex min-h-dvh max-w-[1500px] flex-col px-5 pb-40 pt-6 sm:px-8 lg:px-12 lg:pb-32">
        <header className="flex items-center justify-between border-b border-border/70 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground">R</span>
            <span className="text-sm font-bold uppercase tracking-[0.18em]">Rota Sessions</span>
          </div>
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Faixa única · 2026</span>
        </header>

        <section className="grid flex-1 items-center gap-8 py-8 sm:gap-12 sm:py-10 lg:grid-cols-[minmax(320px,0.85fr)_minmax(430px,1.15fr)] lg:gap-20">
          <div className="mx-auto w-full max-w-[280px] sm:max-w-xl lg:mx-0">
            <div className="cover-shadow relative aspect-square overflow-hidden rounded-md bg-card">
              <audio
                ref={audioRef}
                src={songAsset.url}
                preload="auto"
                playsInline
                crossOrigin="anonymous"
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
            <div className="mt-5 flex items-end justify-between gap-4 sm:mt-7">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">Em reprodução</p>
                <h1 className="font-display text-3xl font-bold sm:text-5xl">Siga a Rota</h1>
                <p className="mt-2 text-base text-muted-foreground">Canção educativa · Prevenção e segurança</p>
              </div>
              <span className="hidden text-sm tabular-nums text-muted-foreground sm:block">{formatTime(duration)}</span>
            </div>
          </div>

          <section className="min-w-0 pb-8 lg:border-l lg:border-border/70 lg:pb-0 lg:pl-16" aria-labelledby="lyrics-title">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">Acompanhamento</p>
                <h2 id="lyrics-title" className="font-display text-3xl font-bold">Letra</h2>
              </div>
              <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span className={isPlaying ? "size-2 animate-pulse rounded-full bg-primary" : "size-2 rounded-full bg-muted-foreground"} />
                {isPlaying ? "Ao vivo" : "Pausado"}
              </span>
            </div>
            <div className="lyrics-mask h-64 overflow-y-auto scroll-smooth pr-3 sm:h-[50vh] sm:min-h-80 sm:max-h-[560px]">
              <div className="flex flex-col gap-4 py-16 sm:py-[35%]">
                {lyrics.map((line, index) => (
                  <button
                    key={`${line.start}-${line.text}`}
                    ref={(element) => { lyricRefs.current[index] = element; }}
                    type="button"
                    onClick={() => seekTo(line.start)}
                    className={`lyric-line text-left font-display text-2xl font-bold leading-tight sm:text-3xl ${
                      index === activeIndex ? "is-active" : index < activeIndex ? "is-past" : ""
                    }`}
                  >
                    {line.text}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </section>
      </div>

      <aside className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-player/95 px-4 py-4 shadow-2xl backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="w-11 text-right text-xs tabular-nums text-muted-foreground">{formatTime(currentTime)}</span>
            <input
              aria-label="Progresso da música"
              type="range"
              min="0"
              max={duration || 174}
              step="0.1"
              value={currentTime}
              onChange={(event) => seekTo(Number(event.target.value))}
              className="progress-range min-w-0 flex-1"
              style={{ "--progress": `${(currentTime / duration) * 100}%` } as React.CSSProperties}
            />
            <span className="w-11 text-xs tabular-nums text-muted-foreground">{formatTime(duration)}</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center">
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-bold">Siga a Rota</p>
              <p className="truncate text-xs text-muted-foreground">Rota Sessions</p>
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
