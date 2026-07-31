# Aviso de exposição de dados: rascunho

Não enviado. Revise, ajuste o tom e decida se envia. Os números vieram do banco
em 31/07/2026 e devem ser reconferidos antes de qualquer envio.

## O que aconteceu, em uma frase

A regra que tornava perfis públicos era ampla demais e expunha também a data de
nascimento, o registro de verificação de idade e o papel da conta, sem exigir
login.

## Escopo apurado

| | |
|---|---|
| Contas com data de nascimento exposta | 25 de 27 |
| Menores de 18 | 2 |
| Menores de 13 | 0 |
| Período | 12/07/2026 a 31/07/2026, cerca de 19 dias |
| Corrigido em | 31/07/2026 |

O período começa na criação do schema, então a falha existiu desde o primeiro
dia. Não houve como determinar se alguém acessou os dados: não existe registro
de leitura que responda isso. Quem tenha copiado continua com a cópia.

## Rascunho da mensagem

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

## Pontos a decidir antes de enviar

- **Canal.** E-mail cadastrado alcança todo mundo; um aviso dentro do app
  alcança quem voltar. Os dois é o mais honesto.
- **Os 2 menores de 18.** Vale considerar se a comunicação para eles precisa de
  cuidado adicional. Nenhum tem menos de 13.
- **ANPD.** A LGPD exige comunicação à autoridade quando há risco ou dano
  relevante. 25 datas de nascimento autodeclaradas, sem menores de 13, dificilmente
  atinge esse limite, mas isso é leitura técnica e não jurídica.
- **Assinatura.** Uma pessoa assinando funciona melhor que "a equipe" numa
  comunidade desse tamanho.
