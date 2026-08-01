# Profile data exposure: notice draft

Not sent. Review it, adjust the tone, and decide whether it goes out. The
numbers were read from the database on 2026-07-31 and should be re-checked
before sending.

The draft message itself stays in Portuguese, because that is the language the
community reads. Everything around it is in English, like the rest of these
documents.

## What happened, in one sentence

The rule that made profiles public was too broad and also exposed birth dates,
the age assurance record, and each account's role, with no sign-in required.

## Measured scope

|                                     |                                    |
| ----------------------------------- | ---------------------------------- |
| Accounts with an exposed birth date | 25 of 27                           |
| Under 18                            | 2                                  |
| Under 13                            | 0                                  |
| Window                              | 2026-07-12 to 2026-07-31, ~19 days |
| Fixed                               | 2026-07-31                         |

The window starts at the creation of the schema, so the flaw existed from the
first day. Whether anyone actually read the data cannot be determined: there is
no read log that would answer it. Anyone who did copy it still has that copy.

## Draft message

> **Assunto: um problema de privacidade no uloggd, e o que já foi feito**
>
> Oi, tudo bem?
>
> Preciso te contar sobre uma falha que encontramos e já corrigimos no uloggd.
>
> Por cerca de 19 dias, desde o início do projeto até 31 de julho, a sua data de
> nascimento ficou acessível para quem soubesse consultar nossa API diretamente,
> mesmo sem estar logado. Junto dela ficaram visíveis a informação de quando e
> como sua idade foi verificada, e se a conta tinha papel de moderação.
>
> Isso não deveria ter acontecido. A tela de Configurações chama a data de
> nascimento de "informação privada e permanente", e nesse período ela não foi
> tratada assim.
>
> **O que não foi exposto:** senha, e-mail, mensagens, ou qualquer conteúdo que
> você tenha marcado como privado. A falha atingia apenas os campos citados
> acima, na tabela de perfis.
>
> **O que já foi feito:** a permissão de leitura desses campos foi removida no
> banco de dados. Hoje eles só podem ser lidos pela própria pessoa dona da
> conta. Também escrevemos testes automatizados que falham se alguém reabrir
> esse acesso por engano no futuro.
>
> **O que não consigo te garantir:** não temos registro de quem consultou a API
> nesse período, então não posso afirmar que ninguém acessou. Se alguém copiou
> os dados, essa cópia continua com essa pessoa e não há como recolher.
>
> Não é preciso trocar senha nem fazer nada da sua parte. Se quiser conversar,
> tirar dúvida ou apagar sua conta, é só responder.
>
> Desculpa mesmo. Foi erro nosso e você merecia saber por nós.

## Decisions to make before sending

- **Channel.** The registered email reaches everyone; an in-app notice reaches
  whoever comes back. Both is the most honest option.
- **The two accounts under 18.** Worth considering whether reaching them needs
  extra care. Neither is under 13.
- **ANPD.** Brazilian law requires notifying the authority when there is
  relevant risk or damage. Twenty-five self-declared birth dates, with nobody
  under 13, is unlikely to meet that bar, but this is an engineering reading
  and not a legal one.
- **Signature.** In a community this size, one person signing reads better than
  "the team".
