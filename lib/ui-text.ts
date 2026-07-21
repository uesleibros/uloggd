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
  couldNotRemove: [
    "Não foi possível remover.",
    "Could not remove.",
    "No se pudo quitar.",
  ],
  clearFilters: ["Limpar filtros", "Clear filters", "Limpiar filtros"],
  notInUse: ["Não utilizados", "Not in use", "Sin usar"],
  block: ["Bloquear", "Block", "Bloquear"],
  unblock: ["Desbloquear", "Unblock", "Desbloquear"],
  safety: ["SEGURANÇA", "SAFETY", "SEGURIDAD"],
  containsSpoilers: [
    "Contém spoilers",
    "Contains spoilers",
    "Contiene spoilers",
  ],
  recommended: ["Recomendo", "Recommended", "Lo recomiendo"],
  notRecommended: ["Não recomendo", "Not recommended", "No lo recomiendo"],
  replay: ["Rejogada", "Replay", "Repetición"],
  authenticatorApp: [
    "Aplicativo autenticador",
    "Authenticator app",
    "Aplicación de autenticación",
  ],
  invalidFormat: ["Formato inválido.", "Invalid format.", "Formato inválido."],
  validFormat: ["Formato válido.", "Valid format.", "Formato válido."],
  signOut: ["Sair da conta", "Sign out", "Cerrar sesión"],
  minimumScore: ["Nota mínima", "Minimum score", "Nota mínima"],
  released: ["Já lançados", "Released", "Ya lanzados"],
  upcoming: ["Próximos lançamentos", "Upcoming", "Próximos lanzamientos"],
  reception: ["Recepção", "Reception", "Recepción"],
  ratedOnly: ["Somente avaliados", "Rated only", "Solo valorados"],
  advancedFilters: [
    "Filtros avançados",
    "Advanced filters",
    "Filtros avanzados",
  ],
  all: ["Todos", "All", "Todos"],
  from: ["De", "From", "Desde"],
  applying: ["Aplicando…", "Applying…", "Aplicando…"],
  previous: ["Anterior", "Previous", "Anterior"],
  next: ["Próxima", "Next", "Siguiente"],
  preferences: ["Preferências", "Preferences", "Preferencias"],
  coverOf: ["Capa de", "Cover of", "Portada de"],
  wishlist: ["Lista de desejos", "Wishlist", "Lista de deseos"],
  clearStatus: ["Limpar status", "Clear status", "Limpiar estado"],
  rated: ["Avaliados", "Rated", "Valorados"],
  clearSearch: ["Limpar busca", "Clear search", "Limpiar búsqueda"],
  change: ["Alterar", "Change", "Cambiar"],
  open: ["Abrir", "Open", "Abrir"],
  favorite: ["Favorito", "Favorite", "Favorito"],
  moreActions: ["Mais ações", "More actions", "Más acciones"],
  insert: ["Inserir", "Insert", "Insertar"],
  removeComment: ["Remover comentário", "Remove comment", "Quitar comentario"],
  report: ["Denunciar", "Report", "Denunciar"],
  help: ["Ajuda", "Help", "Ayuda"],
  confirm: ["Confirmar", "Confirm", "Confirmar"],
  apply: ["Aplicar", "Apply", "Aplicar"],
  optional: ["opcional", "optional", "opcional"],
  seeProfile: ["Ver perfil", "View profile", "Ver perfil"],
} as const satisfies Record<string, readonly [string, string, string]>;

export type UiKey = keyof typeof strings;

const order: Record<UiLang, 0 | 1 | 2> = { "pt-BR": 0, en: 1, es: 2 };

// One frozen object per locale. Returning a fresh object each call made the
// result unstable, so anything listing it in a dependency array would re-run
// on every render.
const cache = new Map<UiLang, Record<UiKey, string>>();

/**
 * `const t = uiText(lang)` then `t.close`. Returning a plain object keeps call
 * sites as short as the ternary they replace.
 */
export function uiText(lang: UiLang): Record<UiKey, string> {
  const cached = cache.get(lang);
  if (cached) return cached;
  const index = order[lang] ?? 0;
  const result = {} as Record<UiKey, string>;
  for (const key of Object.keys(strings) as UiKey[]) {
    result[key] = strings[key][index];
  }
  Object.freeze(result);
  cache.set(lang, result);
  return result;
}

/**
 * Screen-specific copy: text that belongs to one place and would only get
 * harder to read if moved into the shared vocabulary above. Inline like the
 * ternary it replaces, but with all three languages.
 */
export function tri(lang: UiLang, pt: string, en: string, es: string) {
  return lang === "pt-BR" ? pt : lang === "en" ? en : es;
}
