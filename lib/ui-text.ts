/**
 * Shared UI vocabulary for client components.
 *
 * The route dictionaries in `app/[lang]/dictionaries` are `server-only`, so
 * client components had no way to reach them and every one of them inlined its
 * own `pt ? "Fechar" : "Close"`. The same handful of words ended up copied
 * across dozens of files, which is how translations drift apart.
 *
 * This holds only the vocabulary that is genuinely shared. Wording specific to
 * one screen still belongs in that screen — centralising it would just move the
 * problem somewhere harder to read.
 */
export type UiLang = "pt-BR" | "en";

const strings = {
  close: ["Fechar", "Close"],
  cancel: ["Cancelar", "Cancel"],
  save: ["Salvar", "Save"],
  saving: ["Salvando…", "Saving…"],
  remove: ["Remover", "Remove"],
  removing: ["Removendo…", "Removing…"],
  clear: ["Limpar", "Clear"],
  search: ["Buscar", "Search"],
  share: ["Compartilhar", "Share"],
  linkCopied: ["Link copiado", "Link copied"],
  visibility: ["Visibilidade", "Visibility"],
  backToProfile: ["Voltar ao perfil", "Back to profile"],
  followers: ["Seguidores", "Followers"],
  playing: ["Jogando", "Playing"],
  reviews: ["Avaliações", "Reviews"],
  sessions: ["Sessões", "Sessions"],
  lists: ["Listas", "Lists"],
  list: ["Lista", "List"],
  like: ["Curtir", "Like"],
  games: ["Jogos", "Games"],
  gamesLower: ["jogos", "games"],
  privacy: ["Privacidade", "Privacy"],
} as const satisfies Record<string, readonly [string, string]>;

export type UiKey = keyof typeof strings;

/**
 * `const t = uiText(lang)` then `t.close`. Returning a plain object keeps call
 * sites as short as the ternary they replace.
 */
export function uiText(lang: UiLang): Record<UiKey, string> {
  const index = lang === "pt-BR" ? 0 : 1;
  const result = {} as Record<UiKey, string>;
  for (const key of Object.keys(strings) as UiKey[]) {
    result[key] = strings[key][index];
  }
  return result;
}
