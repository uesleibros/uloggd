export type LegalDocument = "terms" | "privacy" | "child-safety";

type Section = { title: string; paragraphs: string[]; bullets?: string[] };
export type LegalContent = {
  title: string;
  intro: string;
  updated: string;
  sections: Section[];
};

const contact = "uloggd.gg@gmail.com";

const pt: Record<LegalDocument, LegalContent> = {
  terms: {
    title: "Termos de Uso",
    intro:
      "Estes termos definem as regras para usar o uloggd e manter a comunidade segura e útil para quem gosta de jogos.",
    updated: "Última atualização: 11 de julho de 2026",
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
    updated: "Última atualização: 11 de julho de 2026",
    sections: [
      {
        title: "1. Dados tratados",
        paragraphs: [
          "Na versão atual, podemos tratar dados técnicos essenciais, como endereço IP, tipo de navegador e registros de segurança. Quando contas forem disponibilizadas, poderemos tratar e-mail, nome de usuário, foto, biblioteca, avaliações, listas e preferências.",
          "Dados de catálogo de jogos vêm da IGDB. Não enviamos suas credenciais da Twitch ou nossos segredos de integração ao navegador.",
        ],
      },
      {
        title: "2. Finalidades",
        bullets: [
          "Fornecer, personalizar e melhorar a plataforma.",
          "Manter contas e preferências sincronizadas.",
          "Prevenir fraude, abuso e incidentes de segurança.",
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
          "O tratamento deve sempre observar o melhor interesse de crianças e adolescentes. Para crianças, adotaremos consentimento específico e destacado de responsável quando exigido, coleta mínima e configurações protetivas por padrão. Consulte nossa página de Segurança Infantil.",
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
    updated: "Última atualização: 11 de julho de 2026",
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

const en: Record<LegalDocument, LegalContent> = Object.fromEntries(
  Object.entries(pt).map(([key, value]) => [
    key,
    {
      ...value,
      intro:
        "This document is currently provided in Portuguese, the governing language for uloggd in Brazil. An English version will be published before public launch.",
    },
  ]),
) as Record<LegalDocument, LegalContent>;

export function isLegalDocument(value: string): value is LegalDocument {
  return value === "terms" || value === "privacy" || value === "child-safety";
}

export function getLegalContent(lang: string, document: LegalDocument) {
  return (lang === "en" ? en : pt)[document];
}
