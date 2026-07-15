export type LegalDocument = "terms" | "privacy" | "cookies" | "child-safety";

type Section = { title: string; paragraphs: string[]; bullets?: string[] };
export type LegalContent = {
  title: string;
  intro: string;
  updated: string;
  sections: Section[];
};

const contact = "contact@uloggd.com";

const pt: Record<LegalDocument, LegalContent> = {
  cookies: {
    title: "Política de Cookies",
    intro:
      "Esta política descreve os cookies e armazenamentos realmente utilizados pelo uloggd.",
    updated: "Última atualização: 13 de julho de 2026",
    sections: [
      {
        title: "1. Uso atual",
        paragraphs: [
          "Atualmente, o uloggd usa cookies estritamente necessários do Supabase para manter e renovar a sessão de autenticação. O Cloudflare Turnstile pode usar dados técnicos e armazenamento necessário para prevenção de abuso. A interface também pode usar armazenamento local para preferências funcionais.",
          "O player opcional do spawnd.gg não é carregado automaticamente. Ao selecionar “Carregar e jogar”, seu navegador se conecta ao spawnd, que pode usar armazenamento e dados técnicos conforme a própria política.",
        ],
      },
      {
        title: "2. Categorias",
        paragraphs: [],
        bullets: [
          "Necessários: autenticação, segurança, balanceamento e prevenção de fraude.",
          "Preferências: idioma e escolhas da interface, quando salvas.",
          "Analytics: não utilizados atualmente.",
          "Marketing: não utilizados atualmente.",
        ],
      },
      {
        title: "3. Suas escolhas",
        paragraphs: [
          "O aviso de cookies informa o uso atual e permite abrir as Configurações de cookies a qualquer momento pelo rodapé. Como não há analytics ou marketing ativos, não solicitamos um aceite enganoso para essas categorias. Cookies necessários não podem ser desativados pela interface sem impedir login e recursos de segurança. Se categorias opcionais forem adicionadas, permanecerão bloqueadas até uma escolha válida, com opções equivalentes para aceitar ou recusar.",
        ],
      },
    ],
  },
  terms: {
    title: "Termos de Uso",
    intro:
      "Estes termos definem as regras para usar o uloggd e manter a comunidade segura e útil para quem gosta de jogos.",
    updated: "Última atualização: 12 de julho de 2026",
    sections: [
      {
        title: "1. Aceitação e elegibilidade",
        paragraphs: [
          "Ao acessar ou criar uma conta no uloggd, você concorda com estes Termos e com a Política de Privacidade. Se você não concordar, não utilize o serviço.",
          "Pessoas menores de 18 anos devem usar a plataforma com conhecimento e supervisão de seus responsáveis. Recursos sociais podem exigir confirmação de idade e autorização do responsável.",
        ],
      },
      {
        title: "2. Sua conta",
        paragraphs: [
          "Você é responsável pelas informações fornecidas, pela segurança de suas credenciais e pelas atividades realizadas em sua conta. Avise-nos imediatamente se suspeitar de acesso não autorizado.",
        ],
      },
      {
        title: "3. Conteúdo e conduta",
        paragraphs: [
          "Você mantém os direitos sobre o conteúdo que publica e concede ao uloggd licença limitada para hospedá-lo e exibi-lo dentro do serviço.",
        ],
        bullets: [
          "Não publique conteúdo ilegal, enganoso, discriminatório ou que viole direitos de terceiros.",
          "Não pratique assédio, ameaça, perseguição, exploração sexual ou exposição de dados pessoais.",
          "Não tente invadir, automatizar abusivamente, prejudicar ou contornar a segurança da plataforma.",
          "Conteúdo que coloque crianças ou adolescentes em risco é estritamente proibido.",
        ],
      },
      {
        title: "4. Moderação",
        paragraphs: [
          "Podemos remover conteúdo, limitar recursos ou suspender contas que violem estes termos. Em situações urgentes de segurança, podemos agir sem aviso prévio e preservar informações conforme exigido por lei.",
        ],
      },
      {
        title: "5. Dados de jogos e terceiros",
        paragraphs: [
          "Informações de jogos são fornecidas pela IGDB e podem conter erros ou mudar. Links e serviços externos possuem seus próprios termos e políticas.",
        ],
      },
      {
        title: "6. Disponibilidade e responsabilidade",
        paragraphs: [
          "O uloggd é fornecido conforme disponível. Trabalhamos para manter o serviço seguro e confiável, mas não garantimos funcionamento ininterrupto. Nada nestes termos exclui direitos obrigatórios previstos na legislação brasileira.",
        ],
      },
      {
        title: "7. Alterações e contato",
        paragraphs: [
          `Podemos atualizar estes termos para refletir mudanças no serviço ou na lei. Alterações relevantes serão comunicadas de forma clara. Dúvidas podem ser enviadas para ${contact}.`,
        ],
      },
    ],
  },
  privacy: {
    title: "Política de Privacidade",
    intro:
      "Esta política explica quais dados o uloggd usa, para quê e quais escolhas você tem.",
    updated: "Última atualização: 15 de julho de 2026",
    sections: [
      {
        title: "1. Dados tratados",
        paragraphs: [
          "Tratamos dados técnicos essenciais, como endereço IP, tipo de navegador e registros de segurança, além de e-mail, username, perfil, biblioteca, avaliações, listas e preferências quando você usa esses recursos.",
          "No cadastro, coletamos sua data de nascimento para aplicar proteção etária conforme a Classificação Indicativa brasileira. Ela não aparece no perfil e, como medida de integridade, não pode ser alterada depois da confirmação. A data informada pelo usuário é uma autodeclaração e poderá ser complementada por métodos de aferição adequados ao risco.",
          "Supabase fornece autenticação e banco de dados; Resend entrega e-mails transacionais configurados no Supabase; Cloudflare Turnstile previne abuso; e o ImgChest hospeda avatares e banners enviados voluntariamente. Google, Discord ou Twitch tratam dados quando você escolhe o respectivo login. Dados de catálogo vêm da IGDB.",
          "Quando você escolhe carregar uma demo incorporada, o player do spawnd.gg é conectado e pode tratar endereço IP, dados técnicos, cookies e informações da sessão de jogo conforme os termos e a política do próprio spawnd. O player permanece bloqueado até essa ação explícita.",
          "Usamos cookies de sessão necessários e armazenamento funcional conforme descrito na Política de Cookies. Não usamos atualmente analytics ou marketing.",
        ],
      },
      {
        title: "2. Finalidades",
        bullets: [
          "Fornecer, personalizar e melhorar a plataforma.",
          "Manter contas e preferências sincronizadas.",
          "Prevenir fraude, abuso e incidentes de segurança.",
          "Restringir jogos incompatíveis com a faixa etária registrada.",
          "Moderar conteúdo e proteger a comunidade.",
          "Cumprir obrigações legais e responder a solicitações válidas.",
        ],
        paragraphs: [],
      },
      {
        title: "3. Bases legais e compartilhamento",
        paragraphs: [
          "Tratamos dados conforme bases legais aplicáveis da LGPD, incluindo execução de contrato, consentimento, legítimo interesse avaliado e cumprimento de obrigação legal. Compartilhamos somente o necessário com provedores de infraestrutura, segurança e serviços solicitados por você. Não vendemos dados pessoais.",
        ],
      },
      {
        title: "4. Retenção e segurança",
        paragraphs: [
          "Mantemos dados pelo período necessário às finalidades informadas, obrigações legais e defesa de direitos. Aplicamos controles de acesso, minimização, comunicação criptografada e monitoramento, mas nenhum sistema é completamente imune a riscos.",
        ],
      },
      {
        title: "5. Seus direitos",
        paragraphs: [
          `Você pode solicitar confirmação, acesso, correção, portabilidade quando aplicável, anonimização, eliminação, informação sobre compartilhamento ou revisão de consentimento pelo e-mail ${contact}. Podemos pedir informações para confirmar sua identidade.`,
        ],
      },
      {
        title: "6. Crianças e adolescentes",
        paragraphs: [
          "O tratamento deve sempre observar o melhor interesse de crianças e adolescentes. O cadastro exige idade mínima de 12 anos; não oferecemos atualmente um fluxo de conta para crianças com consentimento de responsável. Aplicamos coleta mínima, linguagem acessível e configurações protetivas por padrão. Consulte nossa página de Segurança Infantil.",
        ],
      },
      {
        title: "7. Contato",
        paragraphs: [
          `Para questões de privacidade ou exercício de direitos, escreva para ${contact}.`,
        ],
      },
    ],
  },
  "child-safety": {
    title: "Segurança Infantil",
    intro:
      "O uloggd não tolera exploração, abuso ou qualquer conteúdo que coloque crianças e adolescentes em risco.",
    updated: "Última atualização: 12 de julho de 2026",
    sections: [
      {
        title: "Nossa abordagem",
        paragraphs: [
          "Projetamos recursos considerando o melhor interesse de crianças e adolescentes, privacidade elevada por padrão, coleta mínima de dados e limites apropriados para interações sociais. Recursos de mensagem e publicação deverão incluir denúncia, bloqueio e controles de visibilidade antes de serem lançados.",
        ],
      },
      {
        title: "Conteúdo estritamente proibido",
        bullets: [
          "Material de abuso ou exploração sexual infantil, real ou gerado artificialmente.",
          "Aliciamento, sexualização, chantagem, extorsão ou solicitação de imagens íntimas.",
          "Incentivo a automutilação, violência, desafios perigosos ou atividades ilegais.",
          "Exposição de localização, escola, contato ou outros dados pessoais de menores sem autorização.",
          "Assédio, perseguição, discurso de ódio ou tentativa de levar conversas para canais inseguros.",
        ],
        paragraphs: [],
      },
      {
        title: "Denúncia e resposta",
        paragraphs: [
          `Envie denúncias para ${contact} com o assunto “Segurança Infantil”. Informe o link, usuário e uma descrição objetiva. Não baixe, copie nem encaminhe material ilegal. Priorizaremos esses relatos, removeremos conteúdo quando necessário, preservaremos evidências e cooperaremos com autoridades competentes.`,
        ],
      },
      {
        title: "Ajuda imediata no Brasil",
        paragraphs: [
          "Se houver perigo imediato, procure a polícia. Violações contra crianças e adolescentes podem ser denunciadas pelo Disque 100, Conselho Tutelar, Polícia Civil ou Comunica PF. A SaferNet também oferece orientação e canal de denúncia. Uma denúncia ao uloggd não substitui a comunicação às autoridades.",
        ],
      },
      {
        title: "Famílias e responsáveis",
        paragraphs: [
          "Recomendamos diálogo frequente sobre privacidade, contatos desconhecidos e compartilhamento de imagens. Responsáveis podem solicitar informações, revisão ou exclusão de dados de uma criança pelo nosso canal de contato.",
        ],
      },
      {
        title: "Compromisso de evolução",
        paragraphs: [
          "Antes de liberar contas e recursos sociais, implementaremos aferição de idade adequada ao risco, consentimento parental quando aplicável, segurança por padrão, ferramentas de denúncia e procedimentos documentados de resposta.",
        ],
      },
    ],
  },
};

const en: Record<LegalDocument, LegalContent> = {
  cookies: {
    title: "Cookie Policy",
    intro:
      "This policy describes the cookies and storage uloggd actually uses.",
    updated: "Last updated: July 13, 2026",
    sections: [
      {
        title: "1. Current use",
        paragraphs: [
          "uloggd currently uses strictly necessary Supabase cookies to maintain and refresh authentication sessions. Cloudflare Turnstile may use technical data and necessary storage to prevent abuse. The interface may also use local storage for functional preferences.",
          "The optional spawnd.gg player is not loaded automatically. When you select “Load and play,” your browser connects to spawnd, which may use storage and technical data under its own policy.",
        ],
      },
      {
        title: "2. Categories",
        paragraphs: [],
        bullets: [
          "Necessary: authentication, security, load balancing, and fraud prevention.",
          "Preferences: language and interface choices, when saved.",
          "Analytics: not currently used.",
          "Marketing: not currently used.",
        ],
      },
      {
        title: "3. Your choices",
        paragraphs: [
          "The cookie notice explains current use, and Cookie settings can be reopened at any time from the footer. Because no analytics or marketing is active, we do not request misleading consent for those categories. Necessary cookies cannot be disabled in the interface without preventing sign-in and security features. If optional categories are added, they will remain blocked until a valid choice, with equivalent accept and reject options.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Use",
    intro:
      "These terms set the rules for using uloggd and keeping the community safe and useful for people who enjoy games.",
    updated: "Last updated: July 12, 2026",
    sections: [
      {
        title: "1. Acceptance and eligibility",
        paragraphs: [
          "By accessing or creating an account on uloggd, you agree to these Terms and the Privacy Policy. If you do not agree, do not use the service.",
          "People under 18 must use the platform with the knowledge and supervision of a parent or guardian. Social features may require age confirmation and parental authorization.",
        ],
      },
      {
        title: "2. Your account",
        paragraphs: [
          "You are responsible for the information you provide, the security of your credentials, and activity performed through your account. Notify us immediately if you suspect unauthorized access.",
        ],
      },
      {
        title: "3. Content and conduct",
        paragraphs: [
          "You retain the rights to content you publish and grant uloggd a limited license to host and display it within the service.",
        ],
        bullets: [
          "Do not publish illegal, misleading, discriminatory content or content that violates third-party rights.",
          "Do not harass, threaten, stalk, sexually exploit, or expose another person's private information.",
          "Do not attempt to break into, abusively automate, damage, or bypass the platform's security.",
          "Content that puts children or teenagers at risk is strictly prohibited.",
        ],
      },
      {
        title: "4. Moderation",
        paragraphs: [
          "We may remove content, limit features, or suspend accounts that violate these terms. In urgent safety situations, we may act without prior notice and preserve information as required by law.",
        ],
      },
      {
        title: "5. Game data and third parties",
        paragraphs: [
          "Game information is provided by IGDB and may contain errors or change. External links and services are governed by their own terms and policies.",
        ],
      },
      {
        title: "6. Availability and liability",
        paragraphs: [
          "uloggd is provided as available. We work to keep the service safe and reliable but do not guarantee uninterrupted operation. Nothing in these terms excludes mandatory rights under Brazilian law.",
        ],
      },
      {
        title: "7. Changes and contact",
        paragraphs: [
          `We may update these terms to reflect changes to the service or the law. Material changes will be communicated clearly. Questions may be sent to ${contact}.`,
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro:
      "This policy explains which data uloggd uses, why it is used, and the choices available to you.",
    updated: "Last updated: July 15, 2026",
    sections: [
      {
        title: "1. Data we process",
        paragraphs: [
          "We process essential technical data such as IP address, browser type, and security logs, as well as email, username, profile, game library, reviews, lists, and preferences when you use those features.",
          "During registration, we collect your birth date to apply age protection based on Brazil's age-rating system. It is not shown on your profile and, as an integrity measure, cannot be changed after confirmation. The date entered by the user is self-declared and may be supplemented by risk-appropriate age-assurance methods.",
          "Supabase provides authentication and database services; Resend delivers transactional email configured through Supabase; Cloudflare Turnstile prevents abuse; and ImgChest hosts avatars and banners you voluntarily upload. Google, Discord, or Twitch process data when you choose that sign-in provider. Catalog data comes from IGDB.",
          "When you choose to load an embedded demo, the spawnd.gg player connects and may process your IP address, technical data, cookies, and play-session information under spawnd's own terms and privacy policy. The player remains blocked until that explicit action.",
          "We use necessary session cookies and functional storage as described in the Cookie Policy. We do not currently use analytics or marketing.",
        ],
      },
      {
        title: "2. Purposes",
        paragraphs: [],
        bullets: [
          "Provide, personalize, and improve the platform.",
          "Keep accounts and preferences synchronized.",
          "Prevent fraud, abuse, and security incidents.",
          "Restrict games that are incompatible with the registered age group.",
          "Moderate content and protect the community.",
          "Comply with legal obligations and respond to valid requests.",
        ],
      },
      {
        title: "3. Legal bases and sharing",
        paragraphs: [
          "We process data under the applicable legal bases of Brazil's LGPD, including contract performance, consent, assessed legitimate interests, and compliance with legal obligations. We share only what is necessary with infrastructure and security providers and services requested by you. We do not sell personal data.",
        ],
      },
      {
        title: "4. Retention and security",
        paragraphs: [
          "We keep data for as long as necessary for the stated purposes, legal obligations, and the defense of rights. We apply access controls, minimization, encrypted communications, and monitoring, but no system is completely immune to risk.",
        ],
      },
      {
        title: "5. Your rights",
        paragraphs: [
          `You may request confirmation, access, correction, portability where applicable, anonymization, deletion, information about sharing, or withdrawal of consent by emailing ${contact}. We may request information to verify your identity.`,
        ],
      },
      {
        title: "6. Children and teenagers",
        paragraphs: [
          "Processing must always consider the best interests of children and teenagers. Registration requires a minimum age of 12; we do not currently offer a child-account flow with parental consent. We apply data minimization, accessible language, and protective defaults. See our Child Safety page.",
        ],
      },
      {
        title: "7. Contact",
        paragraphs: [
          `For privacy questions or to exercise your rights, email ${contact}.`,
        ],
      },
    ],
  },
  "child-safety": {
    title: "Child Safety",
    intro:
      "uloggd does not tolerate exploitation, abuse, or any content that puts children and teenagers at risk.",
    updated: "Last updated: July 12, 2026",
    sections: [
      {
        title: "Our approach",
        paragraphs: [
          "We design features around the best interests of children and teenagers, high privacy by default, minimal data collection, and appropriate limits on social interactions. Messaging and publishing features must include reporting, blocking, and visibility controls before release.",
        ],
      },
      {
        title: "Strictly prohibited content",
        paragraphs: [],
        bullets: [
          "Child sexual abuse or exploitation material, whether real or artificially generated.",
          "Grooming, sexualization, blackmail, extortion, or requests for intimate images.",
          "Encouragement of self-harm, violence, dangerous challenges, or illegal activity.",
          "Exposure of a minor's location, school, contact details, or other personal information without authorization.",
          "Harassment, stalking, hate speech, or attempts to move conversations to unsafe channels.",
        ],
      },
      {
        title: "Reporting and response",
        paragraphs: [
          `Send reports to ${contact} with the subject “Child Safety.” Include the link, username, and a factual description. Do not download, copy, or forward illegal material. We will prioritize these reports, remove content when necessary, preserve evidence, and cooperate with the appropriate authorities.`,
        ],
      },
      {
        title: "Immediate help in Brazil",
        paragraphs: [
          "If someone is in immediate danger, contact the police. Violations against children and teenagers may be reported through Disque 100, the local Guardianship Council, Civil Police, or Comunica PF. SaferNet also provides guidance and a reporting channel. Reporting to uloggd does not replace notifying the authorities.",
        ],
      },
      {
        title: "Families and guardians",
        paragraphs: [
          "We recommend regular conversations about privacy, unknown contacts, and image sharing. Parents and guardians may request information, review, or deletion of a child's data through our contact channel.",
        ],
      },
      {
        title: "Commitment to improvement",
        paragraphs: [
          "Before releasing accounts and social features, we will implement risk-appropriate age assurance, parental consent where applicable, safety by default, reporting tools, and documented response procedures.",
        ],
      },
    ],
  },
};

export function isLegalDocument(value: string): value is LegalDocument {
  return (
    value === "terms" ||
    value === "privacy" ||
    value === "cookies" ||
    value === "child-safety"
  );
}

export function getLegalContent(lang: string, document: LegalDocument) {
  return (lang === "en" ? en : pt)[document];
}
