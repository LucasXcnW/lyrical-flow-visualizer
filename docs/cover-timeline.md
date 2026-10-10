# Capa sincronizada a partir de 00:12

Branch local `fix/cover-audio-timeline`, baseada em `ed76451`. Prévia neste computador: http://127.0.0.1:4176/. Sem push ou deploy.

## Causa investigada

Na aba do usuário, `matchMedia('(prefers-reduced-motion: reduce)').matches` retornou `true`. A versão anterior encerrava `start()` nessa condição, mantendo `phase="idle"`, vídeo em 0, `readyState=0` e poster opaco. Não havia aviso nem opção de ativação explícita: o botão “Rever animação” havia sido retirado. Isso explica a capa estática durante toda a música nessa prévia.

Os testes anteriores forçavam `reducedMotion: "no-preference"` por padrão. Eles validavam a condição reduzida como estática, mas não ofereciam uma saída acessível ao usuário. O MP4 e os posters continuam disponíveis; a validação HTTP verifica também suporte a Range/206.

Além disso, a implementação era guiada por um evento customizado de play, iniciando sempre do zero. Isso não atendia ao novo requisito de seguir a posição da faixa. A visibilidade dependia de `playing`/`requestVideoFrameCallback`, inadequado para revelar quadros obtidos por busca com o vídeo pausado.

## Correção

- `src/hooks/use-cover-timeline.ts`: posição = `clamp(audio.currentTime - 12, 0, video.duration)`. Usa eventos nativos e o relógio de áudio já existente. Não cria um cronômetro a partir do clique nem atualiza a página inteira a cada frame.
- A reprodução nativa do vídeo proporciona movimento contínuo. Correções de posição limitam desvios; buscas e pausas ajustam o quadro ao áudio. `waiting` interrompe o vídeo, e `playing` o retoma no tempo correto. O pedido de play pode aguardar uma busca em andamento, evitando adiar indefinidamente a reprodução. Correções rotineiras respeitam um intervalo de 0,5 s do próprio áudio; buscas explícitas e pausas são aplicadas imediatamente.
- Antes de 12 segundos, exibe o primeiro poster. Após 18 segundos, mantém o último. O loop real do áudio volta a zero e restaura a introdução. Buscar manualmente também recalcula o quadro, inclusive com áudio pausado.
- O vídeo é preparado durante a introdução após o áudio começar. Carregamento lento não atrasa a música: quando disponível, o vídeo alcança a posição atual do áudio.
- Quadros são revelados após `loadeddata`/`seeked` com dados decodificados, sem depender de um callback que exige vídeo em movimento. Falha de carregamento ou `play()` mantém a capa estática e não interrompe o áudio.
- `AnimatedCover.tsx`: mantém o visual e os posters; movimento reduzido agora é explicado e oferece “Ativar animação” por escolha explícita. Essa opção também segue o relógio atual, sem reiniciar a música. Não altera a preferência do sistema.
- `use-audio-controls.ts`: os dois plays continuam centralizados; removido o evento customizado que disparava a capa. O controlador mantém o loop natural e diferencia uma busca ao último tick da barra.
- Listeners e solicitações pendentes são limpos ao desmontar. Preferências do navegador são lidas somente no cliente, preservando SSR.

O MP4, posters, CSS da moldura, layout da página e os tempos das letras não foram alterados. O início da primeira linha existente continua em 11,7 s; o marco solicitado para o vídeo é exatamente 12 s.

## Validação

- Build de produção Vite, cliente e SSR Netlify: aprovado.
- TypeScript (`tsc --noEmit`), ESLint de todos os arquivos TypeScript alterados/adicionados e `git diff --check`: aprovados.
- 26 cenários funcionais, de falha e layout aprovados em rodadas sequenciais. A última rodada completa dos 25 casos existentes passou; depois foi acrescentada a verificação do controle de movimento com texto a 200%, e os oito casos de movimento/layout foram repetidos com sucesso.
- Dois testes de reprodução integral aprovados: desktop 1440 px e celular Chromium emulado de 360 px, com touch. Cada um tocou os aproximadamente 2 min 49 s completos a 1×, sem busca ou encurtamento, passou pelo término real/loop e verificou a segunda passagem por 00:12. A capa permaneceu inicial até o marco em ambos os ciclos; nenhum reinício indevido foi registrado. O teste também verifica desvio de sincronização abaixo de 0,2 s nas amostras coletadas.
- Ambos os plays foram verificados em 360 e 1440 px. Pausa: relógios estáveis e capturas idênticas do quadro. Retomada: tempo do vídeo continua avançando a partir do ponto pausado, sem voltar a zero. Os quatro casos também passaram numa rodada curta simultânea.
- Buscas pausadas e durante reprodução: 8, 13, 14, 16, 18 e 70 s, retorno a zero, botões de ±10 s, seleção de versos e salto ao último tick da barra.
- Movimento reduzido inicial/dinâmico, ativação por teclado, desativação sem interromper áudio e controle a 200% em 360 px: aprovados. A preferência real da aba do usuário foi conferida, e a ativação explícita foi exercitada na prévia.
- Vídeo lento, HTTP 404, `play()` rejeitado/exceção, áudio rejeitado nos dois botões, imagem final ausente e ausência de callback de frame: aprovados. Poster de fallback, retomada no tempo correto e áudio independente verificados.
- Layout 360, 390, 768 e 1440 px, texto a 200%, proporção quadrada e controles sem colisão/overflow: aprovados. SSR 200, MP4 Range/206 e carregamento inicial sem download do vídeo: aprovados.

As rodadas longas com três navegadores e gravação de trace simultâneos apresentaram timeouts em retomadas de desktop; as reproduções integrais passaram nessas mesmas rodadas. Os casos afetados foram repetidos isoladamente e na rodada curta simultânea, com sucesso. A configuração padrão permanece em um worker. Não se declara uma rodada longa paralela inteiramente aprovada.

Limites: Microsoft Edge/Chromium em Windows, com saída de som silenciada nos testes. Celulares físicos, Safari e Firefox não foram executados; não houve escuta humana integral nem ensaio dedicado de desmontagem. A limpeza foi revisada no código. Nenhum deploy foi realizado.

## Executar

```powershell
Set-Location 'C:\Users\lukin\Downloads\Projeto\lyrical-flow-visualizer-morph'
node node_modules/vite/bin/vite.js build
$env:PLAYWRIGHT_CHANNEL = 'msedge'
node node_modules/@playwright/test/cli.js test
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4176 --strictPort
```

`tests/browser/animated-cover.spec.ts` cobre controles, buscas, acessibilidade, falhas e layout. `tests/browser/full-playback.spec.ts` executa a faixa inteira a 1×, sem buscar nem reduzir sua duração, até o loop e o segundo marco de 12 s. O relatório Playwright guarda as métricas; capturas ficam em `artifacts/timeline-*`.
