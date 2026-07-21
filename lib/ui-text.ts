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
export type UiLang = "pt-BR" | "en" | "es";

/** Order is [pt-BR, en, es] everywhere below. */
const strings = {
  close: ["Fechar", "Close", "Cerrar"],
  cancel: ["Cancelar", "Cancel", "Cancelar"],
  save: ["Salvar", "Save", "Guardar"],
  saving: ["Salvando…", "Saving…", "Guardando…"],
  saved: ["Salvo", "Saved", "Guardado"],
  remove: ["Remover", "Remove", "Quitar"],
  removing: ["Removendo…", "Removing…", "Quitando…"],
  delete: ["Excluir", "Delete", "Eliminar"],
  edit: ["Editar", "Edit", "Editar"],
  clear: ["Limpar", "Clear", "Limpiar"],
  search: ["Buscar", "Search", "Buscar"],
  share: ["Compartilhar", "Share", "Compartir"],
  linkCopied: ["Link copiado", "Link copied", "Enlace copiado"],
  copyLink: ["Copiar link", "Copy link", "Copiar enlace"],
  visibility: ["Visibilidade", "Visibility", "Visibilidad"],
  backToProfile: ["Voltar ao perfil", "Back to profile", "Volver al perfil"],
  back: ["Voltar", "Back", "Volver"],
  followers: ["Seguidores", "Followers", "Seguidores"],
  following: ["Seguindo", "Following", "Siguiendo"],
  follow: ["Seguir", "Follow", "Seguir"],
  requested: ["Solicitado", "Requested", "Solicitado"],
  playing: ["Jogando", "Playing", "Jugando"],
  reviews: ["Avaliações", "Reviews", "Reseñas"],
  sessions: ["Sessões", "Sessions", "Sesiones"],
  lists: ["Listas", "Lists", "Listas"],
  list: ["Lista", "List", "Lista"],
  like: ["Curtir", "Like", "Me gusta"],
  reply: ["Responder", "Reply", "Responder"],
  comment: ["Comentar", "Comment", "Comentar"],
  comments: ["Comentários", "Comments", "Comentarios"],
  games: ["Jogos", "Games", "Juegos"],
  gamesLower: ["jogos", "games", "juegos"],
  privacy: ["Privacidade", "Privacy", "Privacidad"],
  loading: ["Carregando…", "Loading…", "Cargando…"],
  loadMore: ["Carregar mais", "Load more", "Cargar más"],
  tryAgain: ["Tente novamente.", "Try again.", "Inténtalo de nuevo."],
  couldNotLoad: [
    "Não foi possível carregar.",
    "Could not load.",
    "No se pudo cargar.",
  ],
  couldNotSave: [
    "Não foi possível salvar.",
    "Could not save.",
    "No se pudo guardar.",
  ],
  everyone: ["Todas as pessoas", "Everyone", "Todo el mundo"],
  onlyFollowers: ["Somente seguidores", "Followers only", "Solo seguidores"],
  nobody: ["Ninguém", "Nobody", "Nadie"],
  unsavedChanges: [
    "Alterações não salvas",
    "Unsaved changes",
    "Cambios sin guardar",
  ],
  revert: ["Reverter", "Revert", "Revertir"],
} as const satisfies Record<string, readonly [string, string, string]>;

export type UiKey = keyof typeof strings;

const order: Record<UiLang, 0 | 1 | 2> = { "pt-BR": 0, en: 1, es: 2 };

/**
 * `const t = uiText(lang)` then `t.close`. Returning a plain object keeps call
 * sites as short as the ternary they replace.
 */
export function uiText(lang: UiLang): Record<UiKey, string> {
  const index = order[lang] ?? 0;
  const result = {} as Record<UiKey, string>;
  for (const key of Object.keys(strings) as UiKey[]) {
    result[key] = strings[key][index];
  }
  return result;
}
