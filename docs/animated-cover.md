# Capa animada — Siga a Rota

Este documento registra a integração inicial do commit `6637bca`. As regras atuais de play, pausa e loop estão em [Cabeçalho e animação controlada pela música](playback-sync.md), que substitui os comportamentos anteriores de execução automática única e replay independente.

Entrega de 9 de outubro de 2026. Branch local: `feat/siga-rota-morph`.

## Base conferida

- Repositório: https://github.com/LucasXcnW/lyrical-flow-visualizer
- Site: https://lyricsync-player.netlify.app
- O Netlify informou o deploy de produção `6ac4ee0ff265b9aed9e035f4`, da branch `NovoPlayer`, commit `6af312924bd8ef702a1f863322d781d6c41fab67`.
- `git ls-remote` confirmou o mesmo commit na ponta de `NovoPlayer`.
- A implementação parte desse commit em um clone separado, `lyrical-flow-visualizer-morph`. Os diretórios anteriores, incluindo as mudanças não commitadas em `lyrical-flow-visualizer`, foram preservados.
- Nenhum push, PR, alteração de `main`, configuração de publicação ou deploy foi executado.

A aplicação publicada usa React 19, TanStack Start, Vite e `@netlify/vite-plugin` para empacotar SSR. A rota `/` é `src/routes/index.tsx`. A reprodução, seleção e rolagem de versos continuam nessa rota; `ProgressBar` continua pintando o progresso a partir do áudio. Os 43 versos e seus tempos foram comparados à base e permanecem iguais.

## Arquivos desta implementação

| Arquivo | Alteração |
| --- | --- |
| `src/components/player/AnimatedCover.tsx` | Componente isolado com poster inicial, reprodução única pelo evento `playing` do áudio, repetição manual, poster final, movimento reduzido, tratamento de falhas e limpeza de listeners/callbacks. |
| `src/components/player/AnimatedCover.css` | Mídia quadrada com `object-fit: contain`, moldura em creme/terracota/marrom, foco visível e controles fora da imagem. |
| `src/routes/index.tsx` | Integração da capa; botão principal abaixo da mídia; dimensões dos botões fixadas em pixels para evitar colisões com texto a 200%. |
| `public/media/siga-rota-morph.mp4` | Cópia byte a byte do arquivo fornecido, 2.563.643 bytes. |
| `public/media/siga-rota-morph-first.webp` | Frame 0, 1080 × 1080, WebP qualidade 90, 175.288 bytes. |
| `public/media/siga-rota-morph-last.webp` | Frame 359, 1080 × 1080, WebP qualidade 90, 35.468 bytes. |
| `tests/browser/animated-cover.spec.ts`, `playwright.config.ts` | 17 cenários de regressão executados sobre o build compilado. |
| `package.json`, `bun.lock`, `.gitignore` | Comandos de teste/tipos, Playwright apenas para desenvolvimento e exclusão dos relatórios gerados. |
| `README.md`, este documento | Como abrir a prévia e resultado da validação. |

Nenhuma dependência de produção foi adicionada. O componente reutiliza `Button`, React e Lucide. O Playwright 1.63.0 corresponde à versão já disponível no outro checkout do workspace e foi declarado neste clone para que os testes sejam reproduzíveis.

## Mídia e comportamento

FFmpeg confirmou H.264 High, 1080 × 1080, 60 fps, 6 segundos e uma única faixa de vídeo, sem áudio. SHA-256 do MP4 original e da cópia:

```text
a7eed2d2f887d597d438dd2c54691025a885597da08a4df03f88bbc44d73b33b
```

Os posters foram extraídos, sem recriação da arte:

```sh
ffmpeg -i siga-rota-morph.mp4 -frames:v 1 -c:v libwebp -quality 90 siga-rota-morph-first.webp
ffmpeg -i siga-rota-morph.mp4 -vf "select=eq(n\,359)" -frames:v 1 -c:v libwebp -quality 90 siga-rota-morph-last.webp
```

O vídeo usa `preload="none"`, `muted`, `playsInline`, sem loop e sem controles nativos. O poster fica sobre o vídeo até um frame ser apresentado. No término, a imagem final substitui o frame decodificado somente quando está carregada; se ela falhar, o vídeo permanece em seu último frame. Também é verificado `complete/naturalWidth` na montagem, pois a imagem SSR pode carregar antes da hidratação.

A primeira ocorrência de `playing` do áudio consome a execução automática. Pausas, buscas, retomadas e reinícios da música não a renovam. A repetição manual também consome a execução automática, inclusive se for usada antes de ouvir a música. A capa não escreve em nenhuma propriedade do áudio, não compartilha seu relógio e não altera a sincronização da letra.

Com movimento reduzido, o poster é mantido e o vídeo não é baixado automaticamente. “Rever animação” permite execução explícita. Ativar essa preferência durante a reprodução interrompe o vídeo e restaura a imagem estática. Alterar a preferência de volta não programa outra execução automática.

## Como executar

Node usado na validação: 24.19.0. Instalação pelo `bun.lock`, com Bun 1.3.5.

```sh
bun install --frozen-lockfile
bun run build
bun run preview -- --host 127.0.0.1 --port 4176 --strictPort
```

Prévia compilada: http://127.0.0.1:4176/ — disponível neste computador enquanto o servidor estiver em execução.

Neste workspace Windows, sem Bun no PATH:

```powershell
Set-Location 'C:\Users\lukin\Downloads\Projeto\lyrical-flow-visualizer-morph'
& '..\.tools\bun-windows-x64\bun.exe' run build
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4176 --strictPort
```

Testes:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
node node_modules/@playwright/test/cli.js test
node node_modules/typescript/bin/tsc --noEmit
```

Em máquinas sem Edge, omita `PLAYWRIGHT_CHANNEL` e instale o Chromium do Playwright. O runner inicia a prévia compilada quando ela não está em execução.

## Resultados executados

| Verificação | Resultado |
| --- | --- |
| Build Vite de produção, incluindo SSR Netlify | Aprovado; `dist/client` e `.netlify/v1/functions/server.mjs` gerados com a configuração existente. |
| TypeScript (`tsc --noEmit`) | Aprovado. |
| Lint dos arquivos novos e de teste | Aprovado. |
| Lint da rota alterada com regra de formatação desabilitada | Aprovado. |
| Lint global | Não aprovado: problemas de formatação preexistentes e seis avisos de Fast Refresh. A versão original da rota também falha na formatação. Não foi feita reformatação geral do projeto. |
| 17 cenários Playwright no Edge/Chromium | Todos aprovados após correções. A rodada completa final teve 16 aprovados e um erro de precisão no teste; o cenário corrigido passou isoladamente. O cenário de teclado foi repetido com Tab/Enter reais e passou. |
| Primeira reprodução, término natural do vídeo, replay manual, pausa/retomada/busca/término/reinício da música | Aprovados com mídia real; término da música verificado após busca para perto do fim. |
| Sincronização e centralização da letra após seleção/busca | Aprovadas. Dados originais dos versos preservados. |
| Movimento reduzido, preferência dinâmica, teclado e foco visível | Aprovados. |
| Rede lenta para o vídeo, 404, `play()` rejeitado e exceção síncrona | Aprovados por interceptação/simulação no navegador, com áudio independente e sem rejeições não tratadas. |
| Ausência do poster final | Aprovada; conserva o frame nativo final. |
| Layout 360, 390, 768 e 1440 px; 360 px com texto a 200% | Aprovado: mídia quadrada, conteúdo contido, controles de pelo menos 44 px, sem colisão nem overflow horizontal. |
| SSR e assets locais | Página responde 200, vídeo suporta 206/Range, posters respondem 200. |
| Integridade do build | Os três assets novos têm hashes idênticos entre `public/media` e `dist/client/media`. |
| Carregamento inicial | Nenhuma requisição do MP4 antes do início; poster inicial compartilhado entre `<img>` e `<video>` com uma única requisição no teste. |

Capturas em `artifacts/morph-360-poster.png`, `artifacts/morph-360-ended.png`, `artifacts/morph-1440-poster.png` e `artifacts/morph-1440-ended.png`, além das larguras intermediárias. Os diretórios de capturas e relatórios são locais e ignorados pelo Git.

### Correções durante a validação

1. Reconhecer o poster final que já havia carregado antes da hidratação SSR.
2. Permitir quebra do texto de “Rever animação” e fixar a dimensão dos botões de ícone, corrigindo colisões com texto ampliado.
3. Ajustar a busca automatizada à precisão de 0,01 segundo da barra de progresso existente.

### Limites

Navegador real validado: Microsoft Edge/Chromium no Windows, com saída de áudio silenciada nos testes. As dimensões móveis e o movimento reduzido foram emulados; não houve execução em aparelhos físicos, Safari ou Firefox, nem escuta humana integral da música. A limpeza de listeners, callback de frame e Promises pendentes foi revisada no código; não há teste dedicado de desmontagem. O caminho sem `requestVideoFrameCallback` foi implementado, mas não exercitado no navegador usado.

Não foi feita publicação ou verificação desta alteração no CDN do Netlify. A publicação depende da autorização do usuário após revisar a prévia. `NovoPlayer` é a branch de produção confirmada: um push nela pode acionar publicação. Esta entrega permanece apenas na branch local separada.
