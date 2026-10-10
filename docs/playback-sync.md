# Cabeçalho e animação controlada pela música

Branch: `feat/siga-rota-playback-sync`, baseada na integração anterior (`6637bca`). O checkout permanece em `lyrical-flow-visualizer-morph`. Esta entrega é local, sem push ou deploy.

## Comportamento atual

- O ícone `ShieldCheck` foi removido do cabeçalho. O texto começa na margem do conteúdo, e a altura mínima do cabeçalho foi preservada nos breakpoints existentes.
- Os botões junto à capa e no dock usam o mesmo `togglePlayback`.
- Cada play pelos botões cria uma intenção. Somente o evento efetivo `playing` do áudio a confirma e inicia uma execução do vídeo desde zero.
- Pausar congela o quadro apresentado. O próximo play reinicia o vídeo, enquanto a música retoma sua posição.
- Ao terminar naturalmente, a música repete automaticamente: volta a zero e solicita reprodução. Quando o novo áudio começa, a animação reinicia uma vez.
- A conclusão do vídeo mantém o último frame e não agenda outra execução.
- Buscas, avanço/retrocesso e seleção de versos não criam intenções de animação. A seleção de verso mantém a reprodução da música e a rolagem da letra.
- Saltar diretamente para o último tick da barra é distinguido do término natural. Esse salto não dispara o loop; a tolerância corresponde ao passo existente de 0,01 segundo.
- Com movimento reduzido, o áudio funciona e a capa permanece estática. Ativar a preferência durante a animação congela o quadro; desativá-la não inicia movimento por conta própria.
- O botão independente “Rever animação” foi retirado para respeitar a regra de gatilhos exclusivos: play pelos dois botões ou loop do áudio.

## Implementação

| Arquivo | Finalidade |
| --- | --- |
| `src/hooks/use-audio-controls.ts` | Controlador único com origens `button`, `loop` e `lyrics`, confirmação em `playing`, cancelamento de solicitações e tratamento de rejeições. |
| `src/components/player/AnimatedCover.tsx` | Escuta a intenção confirmada; congela em pausa/término/erro do áudio; preserva o frame final e os fallbacks. |
| `src/components/player/AnimatedCover.css` | Mantém a moldura e a posição do play; remove os estilos do comando independente retirado. |
| `src/routes/index.tsx` | Remove ícone, integra os controles, marca buscas manuais e mantém o relógio das letras funcionando em cada ciclo. |
| `tests/browser/animated-cover.spec.ts` | Atualiza a regressão para as novas regras. |
| `README.md`, documentação | Aponta para a entrega atual e conserva o registro da integração inicial. |

O loop usa o evento `ended` do áudio, sem depender de uma heurística de recuo do relógio: recuar manualmente para zero não é classificado como loop. Os listeners são removidos na desmontagem, solicitações obsoletas são invalidadas e callbacks de frame pendentes são cancelados. O vídeo mantém seu próprio relógio; os versos e o progresso continuam usando apenas o áudio.

Nenhuma dependência ou asset foi adicionado. Os 43 versos e seus tempos foram comparados ao commit anterior e permanecem iguais. Os hashes dos assets em `public/media` e `dist/client/media` também foram comparados e são idênticos.

## Validação executada

- Build de produção Vite, cliente e SSR Netlify: aprovado.
- `tsc --noEmit`: aprovado.
- ESLint do controlador, da capa e dos testes: aprovado. A rota foi verificada com a regra de formatação desabilitada, devido à formatação preexistente documentada na entrega anterior.
- 24 testes no Microsoft Edge/Chromium sobre o build compilado: aprovados em uma rodada completa, cerca de 1,3 minuto.
- Ambos os botões: play, pausa pelo outro botão e retomada desde zero, com uma chamada de `video.play()` por acionamento.
- Congelamento: tempo do áudio/vídeo estável e capturas da área da mídia idênticas após a pausa.
- Último frame e dois ciclos naturais do áudio: aprovados. Os ciclos foram alcançados com busca para 0,4 segundo antes do fim e término real da mídia.
- Busca manual para zero, avanço/retrocesso, busca pausada e salto ao tick final: aprovados sem reiniciar a animação.
- Seleção de verso e centralização da letra: aprovadas sem acionar o vídeo.
- Movimento reduzido inicial/dinâmico e Tab/Enter: aprovados.
- Rejeição do áudio em ambos os botões, clique rápido durante carregamento, vídeo lento, HTTP 404 e rejeição/exceção de `video.play()`: aprovados.
- Layout: 360, 390, 768 e 1440 px; texto ampliado a 200% em 360 px. Mídia quadrada, controles acessíveis e sem colisão/overflow horizontal.
- SSR 200 e vídeo com Range/206: aprovados.

Após preservar a altura mínima do cabeçalho, o build e os testes de cabeçalho/layout foram repetidos. As capturas atuais ficam em `artifacts/sync-360-poster.png`, `artifacts/sync-360-ended.png`, `artifacts/sync-1440-poster.png` e `artifacts/sync-1440-ended.png`.

Os testes silenciaram a saída de áudio e emularam os tamanhos móveis. Safari, Firefox e aparelhos físicos não foram executados. Não houve teste dedicado de desmontagem ou escuta humana integral; a limpeza foi revisada no código.

## Prévia

```powershell
Set-Location 'C:\Users\lukin\Downloads\Projeto\lyrical-flow-visualizer-morph'
node node_modules/vite/bin/vite.js build
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4176 --strictPort
```

Abra http://127.0.0.1:4176/ neste computador enquanto o servidor estiver ativo. Para repetir os testes:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
node node_modules/@playwright/test/cli.js test
```
