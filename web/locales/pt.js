export default {
  home: {
    greeting: {
      morning: "Bom dia",
      afternoon: "Boa tarde",
      evening: "Boa noite",
    },
    hero: {
      title: "Descubra, colecione, seus jogos.",
      description: "Acompanhe tudo que você já jogou, está jogando ou quer jogar. Organize sua biblioteca pessoal, crie tierlists e rankings personalizados, dê notas aos seus jogos favoritos e descubra o que a comunidade está curtindo. Compare suas classificações com outros jogadores, explore recomendações baseadas nos seus gostos e mantenha tudo atualizado automaticamente conforme você joga.",
    },
    sections: {
      communityFavorites: "Favoritos da comunidade",
    },
  },
  notFound: {
    title: "404",
    message: "Essa página não existe ou foi movida.",
    backHome: "Voltar para a home",
  },
  common: {
    back: "Voltar",
    backToHome: "Voltar ao início",
    copyLink: "Copiar link",
    save: "Salvar",
    add: "Adicionar",
    edit: "Editar",
    delete: "Excluir",
    remove: "Remover",
    reorder: "Reordenar",
    mark: "Marcar",
    unmark: "Desmarcar",
    private: "Privada",
    games: "{{count}} jogo",
    games_plural: "{{count}} jogos",
    marked: "{{count}} marcado",
    marked_plural: "{{count}} marcados",
    updated: "Atualizada {{date}}",
  },
  list: {
    notFound: {
      title: "Lista não encontrada",
      message: "Esta lista não existe, foi removida ou é privada.",
    },
    private: {
      title: "Lista privada",
      message: "Esta lista é privada e só pode ser vista pelo autor.",
    },
    empty: {
      owner: "Esta lista está vazia. Adicione alguns jogos!",
      visitor: "Esta lista ainda não tem jogos.",
    },
    actions: {
      addGames: "Adicionar jogos",
      editList: "Editar lista",
      deleteList: "Excluir lista",
    },
  },
  tierlist: {
    notFound: {
      title: "Tierlist não encontrada",
      message: "Esta tierlist não existe, foi removida ou é privada.",
    },
    private: {
      title: "Tierlist privada",
      message: "Esta tierlist é privada e só pode ser vista pelo autor.",
    },
    rankedGames: "{{count}} jogo classificado",
    rankedGames_plural: "{{count}} jogos classificados",
  },
  search: {
    meta: {
      title: "{{query}} - Busca - uloggd",
      titleDefault: "Busca - uloggd",
      description: "Busque jogos, usuários e listas no uloggd",
    },
    results: {
      games: "{{count}} jogo",
      games_plural: "{{count}} jogos",
      by: "por",
    },
    empty: {
      startTitle: "Comece a buscar",
      startDescription: "Digite algo no campo de busca para encontrar jogos, usuários ou listas",
      noResultsTitle: "Nenhum resultado",
      noResultsDescription: "Não encontramos nada para \"{{query}}\". Tente usar palavras diferentes.",
    },
    filters: {
      showing: "Mostrando",
      results: "resultados",
      sortBy: "Ordenar:",
    },
    sort: {
      relevance: "Relevância",
      newest: "Mais recentes",
      oldest: "Mais antigos",
      nameAsc: "Nome A-Z",
      nameDesc: "Nome Z-A",
      popular: "Populares",
      rating: "Melhor avaliados",
    },
    tabs: {
      games: "Jogos",
      users: "Usuários",
      lists: "Listas",
    },
    sort: {
      relevance: "Relevância",
      name: "Nome (A-Z)",
      rating: "Avaliação",
      release_desc: "Mais recentes",
      release_asc: "Mais antigos",
      username: "Nome (A-Z)",
      newest: "Mais recentes",
      title: "Título (A-Z)",
      games_count: "Mais jogos",
    },
    header: {
      title: "Explorar",
      subtitle: "Encontre jogos, usuários e listas",
      placeholder: "O que você está procurando?",
      resultsFound: "{{count}} resultado encontrado",
      resultsFound_plural: "{{count}} resultados encontrados",
    },
  },
  profile: {
    notFound: {
      title: "Usuário não encontrado",
      message: "O usuário \"{{username}}\" não existe ou foi removido.",
    },
    followModal: {
      followers: "Seguidores",
      following: "Seguindo",
    },
    navigation: {
      profile: "Perfil",
      games: "Jogos",
      lists: "Listas",
      tierlists: "Tierlists",
      reviews: "Reviews",
      likes: "Curtidas",
      activity: "Atividade",
    },
    header: {
      banned: {
        title: "Conta suspensa",
        description: "Este usuário foi suspenso por violar os termos da plataforma.",
        reason: "Motivo: {{reason}}",
      },
      lastSeen: "Última vez visto: {{time}}",
    },
    content: {
      activityComingSoon: "Atividade em breve",
    },
    bio: {
      title: "Sobre",
      copyMarkdown: "Copiar código Markdown",
    },
    followModal: {
      followers: "Seguidores",
      following: "Seguindo",
      searchPlaceholder: "Buscar usuário...",
      noResults: "Nenhum usuário encontrado",
      empty: "Nenhum usuário",
    },
    lists: {
      title: "Listas",
      create: "Criar lista",
      edit: "Editar",
      editList: "Editar lista",
      delete: "Excluir",
      deleteList: "Excluir lista",
      cancel: "Cancelar",
      private: "Privada",
      createFirst: "Criar primeira lista",
      empty: {
        own: "Você ainda não criou nenhuma lista.",
        other: "{{username}} ainda não criou nenhuma lista.",
        hint: "Organize seus jogos em listas personalizadas.",
      },
    },
    actions: {
      editProfile: "Editar perfil",
      edit: "Editar",
      following: "Seguindo",
      follow: "Seguir",
    },
  },
}