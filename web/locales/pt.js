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
    likes: {
      tabs: {
        games: "Jogos",
        reviews: "Reviews",
      },
      empty: {
        title: "Nenhuma curtida ainda",
        own: "Jogos e reviews que você curtir aparecerão aqui",
        other: "{{username}} ainda não curtiu nada",
      },
      emptyGames: {
        own: "Você ainda não curtiu nenhum jogo",
        other: "{{username}} ainda não curtiu nenhum jogo",
      },
      emptyReviews: {
        own: "Você ainda não curtiu nenhuma review",
        other: "{{username}} ainda não curtiu nenhuma review",
      },
    },
    reviews: {
      title: "Reviews",
      rated: "avaliou",
      game: "Jogo",
      empty: {
        title: "Nenhuma review ainda",
        subtitle: "As reviews escritas aparecerão aqui",
      },
    },
    stats: {
      followers: "seguidores",
      following: "seguindo",
      followsYou: "Segue você",
      activity: "Atividade",
      watching: "assistindo",
      playingNow: "Jogando agora",
      view: "Ver",
      playing: "Jogando",
      played: "Jogados",
      backlog: "Backlog",
      rated: "Avaliados",
    },
    tabs: {
      playing: "Jogando",
      played: "Jogados",
      backlog: "Backlog",
      wishlist: "Wishlist",
      dropped: "Largados",
      shelved: "Na prateleira",
      rated: "Avaliados",
      exploreGames: "Explorar jogos",
      empty: {
        fallback: "Nenhum jogo aqui.",
        playing: {
          own: "Você não está jogando nada no momento.",
          other: "{{username}} não está jogando nada no momento.",
        },
        played: {
          own: "Você ainda não jogou nenhum jogo.",
          other: "{{username}} ainda não jogou nenhum jogo.",
        },
        backlog: {
          own: "Seu backlog está vazio.",
          other: "{{username}} não tem jogos no backlog.",
        },
        wishlist: {
          own: "Sua wishlist está vazia.",
          other: "{{username}} não tem jogos na wishlist.",
        },
        dropped: {
          own: "Você não abandonou nenhum jogo.",
          other: "{{username}} não abandonou nenhum jogo.",
        },
        shelved: {
          own: "Você não engavetou nenhum jogo.",
          other: "{{username}} não engavetou nenhum jogo.",
        },
        rated: {
          own: "Você ainda não avaliou nenhum jogo.",
          other: "{{username}} ainda não avaliou nenhum jogo.",
        },
      },
    },
  },
  badges: {
    meta: {
      title: "Selos - uloggd",
      description: "Conheça todos os selos disponíveis no uloggd e o que cada um representa.",
    },
    title: "Selos",
    subtitle: "Distintivos que representam funções, conquistas e reconhecimentos na plataforma.",
    categories: {
      team: {
        title: "Equipe",
        description: "Membros oficiais da equipe uloggd",
      },
      community: {
        title: "Comunidade",
        description: "Reconhecimentos da comunidade",
      },
    },
    verification: {
      title: "Verificação de perfil",
      description: "Criadores de conteúdo, membros ativos da comunidade e figuras públicas podem solicitar o selo de verificação.",
      request: "Solicitar",
      inReview: "Em análise",
    },
    modal: {
      request: {
        title: "Solicitar verificação",
        subtitle: "Descreva sua atuação na comunidade de games.",
        placeholder: "Ex: Sou jogador ativo há 5 anos, participo de comunidades de RPG, criador de conteúdo com 10k seguidores...",
        cancel: "Cancelar",
        submit: "Enviar",
      },
      pending: {
        title: "Solicitação em análise",
        description: "Sua solicitação está sendo avaliada pela equipe. Você será notificado quando houver uma atualização.",
        confirm: "Entendi",
      },
      success: {
        title: "Solicitação enviada",
        description: "Você receberá uma notificação quando sua solicitação for analisada.",
        close: "Fechar",
      },
    },
    errors: {
      submitFailed: "Erro ao enviar solicitação.",
    },
  },
  game: {
    meta: {
      description: "Veja informações sobre {{name}} no uloggd",
    },
    notFound: {
      title: "Jogo não encontrado",
    },
    content: {
      stats: {
        ratings: "Avaliações",
        hype: "Hype",
        platforms: "Plataforma(s)",
      },
      about: "Sobre",
      showLess: "Mostrar menos",
      readMore: "Ler mais",
      translate: {
        button: "Traduzir",
        translating: "Traduzindo...",
        showOriginal: "Ver original",
        showTranslation: "Ver tradução",
        autoTranslated: "Traduzido automaticamente",
      },
      info: {
        developer: "Desenvolvedora",
        publisher: "Publicadora",
        genres: "Gêneros",
        themes: "Temas",
        modes: "Modos",
        engine: "Engine",
      },
      media: {
        title: "Capturas de tela/Artes",
        image: "{{count}} imagem",
        image_plural: "{{count}} imagens",
        viewAll: "Ver todas ({{count}})",
      },
    },
    header: {
      ratings: {
        total: "Total",
        critics: "Crítica",
        users: "Usuários",
      },
      parentGame: "Jogo principal",
    },
    sidebar: {
      parentGame: "Jogo principal",
      ageRatings: "Classificações de Idade",
      platforms: "Plataformas",
      ratings: {
        total: "Total",
        critics: "Crítica",
        users: "Usuários",
      },
    },
  },
}
