# Entrega: mídia Square Cloud e correções de interface

## 1. Resumo

Novos uploads de avatar, banner, captura e imagem de jornada passam pelo Square Cloud Blob. Estáticos são AVIF e animações de perfil são WebP. As premiações receberam tabs selecionadas, selects corrigidos, navegação mobile, skeletons, feedback de ações e paginação suave. Bordas neutras usam os mesmos tokens de superfície/controle; a página do jogo usa fundos sólidos consistentes. A borda de redimensionamento da sidebar ocupa toda a altura, o divisor do editor mantém o cursor e o espaço entre nível e verificação foi reduzido.

## 2. Arquivos criados

- `lib/user-image.ts`, `image-animation.ts`: processamento e detecção antes do crop.
- `lib/square-blob.ts`, `blob-storage-core.ts`: fachada privada S3 e comandos testáveis.
- `lib/media-url.ts`, `media-download.ts`, `media-cleanup.ts`, `media-migration.ts`: referências, download limitado, fila de limpeza e migração.
- `lib/profile-image-error.ts`, `catalog-background.ts`: mensagens comuns e trabalho de catálogo fora do contexto de renderização.
- Quatro scripts de mídia, três migrações SQL, testes unitários/DB/browser e documentação operacional.

## 3. Arquivos alterados

Rotas de upload/remoção em `app/api/profile/image`, `screenshots`, `v1/screenshots` e `journal/images`; consumidores de avatar/banner/capturas nas páginas, componentes e imagens OG; componentes de premiações, sidebar mobile, configurações e crop; CSS global/de premiações/perfil; catálogo Redis e captura do contexto da API; configuração Next, workflow de deploy, variáveis de exemplo, README e documentação. `lib/imgchest.ts` foi removido. A dependência S3 já adicionada ao projeto é usada pela nova fachada.

## 4. Pipeline

Autenticação/ownership e limites → metadados reais com Sharp → validação de MIME, pixels, quadros e duração → orientação/redimensionamento/sRGB → codificação com tentativas limitadas → análise confiável dos bytes finais → upload UUID com cache immutable → gravação da chave no banco → resposta com URL pública. Falha no banco remove o arquivo novo ou registra tentativa de limpeza. O histórico recente de perfil continua com cinco imagens reutilizáveis; arquivos referenciados não são removidos.

## 5. Detecção de animação

O servidor usa `pages`, `pageHeight`, `delay` e `loop` do decoder. GIF/WebP animados mantêm todos os quadros e o resultado é verificado novamente. O navegador identifica GIF e a flag de animação WebP para evitar o canvas estático. Sequências AVIF e APNG sem suporte confiável são recusadas; não viram silenciosamente uma imagem estática.

## 6. AVIF

Qualidades 58 → 54 → 50 → 46, effort 3, chroma 4:4:4, sem metadados originais. O buffer redimensionado é reutilizado entre tentativas. AVIF estático vindo do usuário também é validado e normalizado.

## 7. WebP

Qualidades 82 → 78 → 75, effort 4, alphaQuality 100 e smartSubsample. Timing e loop explícitos e preservados. A redução de qualidade respeita um piso; arquivos acima do limite final são recusados.

## 8–10. Limites por uso

| Uso | Dimensões máximas | Alvo estático | Limite estático | Limite animado |
|---|---|---|---|---|
| Avatar | 512 × 512 | 100 KiB | 500 KiB | 4 MiB |
| Banner | 1600 × 600 | 320 KiB | 1 MiB | 6 MiB |
| Captura/jornada | 1920 × 1080 | 650 KiB | 2 MiB | Recusado |

Redimensionamento dentro da caixa, sem ampliar arquivos pequenos. Capturas e imagens de jornada continuam estáticas.

## 11. Animação e memória

Entrada até 15 MiB, 40 milhões de pixels decodificados no total e 300 quadros. Avatar até 15 segundos; banner até 20. Uma tarefa de mídia ativa por worker por padrão, espera/fila limitadas nas rotas, Sharp com dois threads e cache de pixels desativado. Com três workers, até três tarefas podem processar simultaneamente. Nenhum original ou thumbnail separado é armazenado.

## 12–13. Benchmarks locais

Resultados medidos neste Windows; fixtures sintéticas exceto logo e o GIF fornecido. Tempos são de conversão, **não incluem NSFW nem upload**.

| Amostra | Entrada | Saída | Redução | Conversão |
|---|---:|---:|---:|---:|
| HUD PNG 1920 × 1080 | 143.575 B | AVIF 6.698 B | 95,3% | 212 ms |
| HUD JPEG | 45.499 B | AVIF 7.371 B | 83,8% | 139 ms |
| Arte | 44.405 B | AVIF 3.384 B | 92,4% | 56 ms |
| Pixel art | 8.030 B | AVIF 884 B | 89,0% | 25 ms |
| Logo/avatar | 37.872 B | AVIF 1.877 B | 95,0% | 48 ms |
| GIF enviado, 50 quadros | 7.032.728 B | WebP 1.417.812 B | 79,8% | 3.393 ms |

No HUD, effort AVIF 2/3/4 levou 92/102/226 ms, respectivamente. Effort 3 mantém uma troca adequada entre CPU e tamanho. Compressão varia com ruído, transparência e movimento; arquivos minúsculos podem crescer por overhead do codec.

## 14. Banco

Migrações `20261003000100`–`20261003000300` aplicadas. Constraints aceitam chaves pertencentes ao usuário e URLs legadas durante a transição. `replace_profile_media` faz atualização e histórico atomicamente, acessível apenas ao backend. Triggers registram arquivos removidos/cascatas em `media_delete_queue`; `media_is_referenced` evita apagar arquivos ainda usados. `media_migrations` permite retomar o backfill. Não há binário de mídia no banco.

## 15–16. Migração

Backfill agrupado por usuário/tipo/URL, com ledger, verificação do objeto, atualização condicional e retomada. Dry-run real com três grupos passou sem upload ou alteração de referências. Os arquivos históricos não foram migrados em massa nesta entrega e continuam legíveis. A ferramenta nunca exclui arquivos do ImgChest.

```sh
npm run media:migrate -- --dry-run
npm run media:migrate -- --dry-run --limit 20 --user username --type avatar
npm run media:migrate -- --limit 20 --user username
npm run media:cleanup
```

## 17. Ambiente

`SQUARE_BLOB_ENDPOINT`, `SQUARE_BLOB_REGION`, `SQUARE_BLOB_BUCKET`, `SQUARE_BLOB_ACCESS_KEY_ID`, `SQUARE_BLOB_SECRET_ACCESS_KEY` e `NEXT_PUBLIC_MEDIA_BASE_URL`. Somente a última é pública. O usuário confirmou que estão no painel Square Cloud; o deploy reinicia a aplicação. O workflow inclui o CDN público no build, com padrão `https://media.uloggd.com`. Credenciais permanecem no servidor.

## 18–19. Verificação

- TypeScript e ESLint passaram.
- 421 testes unitários: 420 passaram, um teste dependente de imagem local de regressão já existente foi ignorado.
- Três testes de banco passaram: substituição, ownership/permissões, histórico e limpeza em cascata.
- Smoke real S3 passou: estático AVIF e animação WebP, HeadObject, leitura pública, cache immutable de um ano e exclusão.
- Build padrão `npm run build` com Next 16.3.8/Turbopack passou.
- Fluxos de premiações passaram em desktop e mobile: criar, personalizar, publicar, compartilhar e elegibilidade pela lista atual.
- Seis testes de premiações, incluindo skeleton com resposta retida e erro com retry; quatro testes de avatar/histórico; dois de captura/jornada; dez de navegação passaram no servidor compilado.

## 20. Limites e observações

A análise NSFW continua no servidor: assinar uma previsão fornecida pelo navegador não prova que o modelo foi executado. Animações longas exigem análise de cada quadro distinto; upload não tem o mesmo tempo da conversão isolada. A migração histórica e a remoção posterior do fallback são operações separadas. O armazenamento é público por URL; as regras de visibilidade controlam quem recebe a referência. Falhas de exclusão têm retry pela fila/rotinas de manutenção.

O Redis recebe somente dados públicos da IGDB, inclusive jogos usados em premiações. Orçamento do cache 416 MiB, teto de pressão por memória usada/RSS 432 MiB em uma instância de 512 MiB, LRU, expiração e escrita fora do caminho de resposta. Trabalho de catálogo usa fila limitada no processo persistente, evitando o contexto `after()` que causava a leitura tardia de cookies na página de jogo.

Detalhes e referências técnicas: [operação de mídia](square-blob-media.md), [Sharp output](https://sharp.pixelplumbing.com/api-output/) e [Sharp metadata](https://sharp.pixelplumbing.com/api-input/).
