# Ligar as notificações push

O código está pronto e inerte: sem as variáveis abaixo, a rota de entrega
responde 204 sem fazer nada, o gatilho do banco não chama ninguém, e o cartão
em Configurações não aparece. Nada quebra por estar desligado.

São três passos, todos fora do repositório de propósito, porque envolvem
segredos.

## 1. Gerar as chaves VAPID

Um par por ambiente. Rode uma vez e guarde:

```bash
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

## 2. Variáveis na Vercel

| Variável                       | Valor                                  |
| ------------------------------ | -------------------------------------- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | a chave pública                        |
| `VAPID_PUBLIC_KEY`             | a mesma chave pública                  |
| `VAPID_PRIVATE_KEY`            | a chave privada                        |
| `VAPID_SUBJECT`                | `mailto:` com um e-mail seu de contato |
| `PUSH_DISPATCH_SECRET`         | um segredo aleatório, veja abaixo      |

A pública aparece duas vezes porque o navegador precisa dela para se inscrever
e o servidor precisa dela para assinar. A privada nunca vai para o cliente.

Para o segredo:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## 3. Apontar o banco para a aplicação

O gatilho em `notifications` só chama a aplicação se esta linha existir. Rode
com credencial de serviço, substituindo o segredo pelo mesmo do passo 2:

```sql
insert into private.push_config (dispatch_url, secret)
values ('https://uloggd.com/api/push/dispatch', 'SEGREDO_AQUI')
on conflict (id) do update
  set dispatch_url = excluded.dispatch_url,
      secret = excluded.secret;
```

A tabela é `private`, sem acesso para `anon` nem `authenticated`.

## Conferindo

1. Configurações → Preferências → Notificações push → "Ativar neste aparelho".
   O navegador pede permissão; aceite.
2. Peça para alguém curtir algo seu, ou insira uma notificação à mão.
3. Deve chegar mesmo com o uloggd fechado.

Se não chegar, olhe nesta ordem:

- `select * from net.http_request_queue order by id desc limit 5` mostra se o
  banco tentou chamar.
- `select * from net._http_response order by id desc limit 5` mostra o que a
  aplicação respondeu. 401 significa segredo diferente entre o passo 2 e o 3.
- 204 com a fila vazia de resposta significa que a rota rodou mas não havia
  aparelho inscrito para aquele destinatário.

## O que fica de fora

Uma notificação leva o usuário para o feed, não para o item específico. As
linhas de `notifications` guardam `target_id`, mas não o tipo de rota, então
montar o link certo por tipo é um trabalho à parte.

O iPhone só entrega push para um site **instalado na tela de início**. No
Safari comum não há inscrição possível, e o cartão diz isso.
