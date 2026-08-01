# Turning on push notifications

The code ships inert. Without the variables below the dispatch route answers
204 and does nothing, the database trigger calls nobody, and the card in
Settings does not render. Nothing breaks by being switched off.

Three steps, all deliberately outside the repository, because they involve
secrets.

## 1. Generate the VAPID keys

One pair per environment. Run once and keep the output:

```bash
node -e "console.log(require('web-push').generateVAPIDKeys())"
```

## 2. Environment variables on Vercel

| Variable                       | Value                       |
| ------------------------------ | --------------------------- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | the public key              |
| `VAPID_PUBLIC_KEY`             | the same public key         |
| `VAPID_PRIVATE_KEY`            | the private key             |
| `VAPID_SUBJECT`                | `mailto:contact@uloggd.com` |
| `PUSH_DISPATCH_SECRET`         | a random secret, see below  |

The public key appears twice because the browser needs it to subscribe and the
server needs it to sign. The private key never reaches the client.

For the secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## 3. Point the database at the application

The trigger on `notifications` only calls the application if this row exists.
Run it with service credentials, using the same secret as step 2:

```sql
insert into private.push_config (dispatch_url, secret)
values ('https://uloggd.com/api/push/dispatch', 'SECRET_HERE')
on conflict (id) do update
  set dispatch_url = excluded.dispatch_url,
      secret = excluded.secret;
```

The table lives in `private`, with no access for `anon` or `authenticated`.

## Checking it works

1. Settings → Preferences → Push notifications → "Turn on for this device".
   The browser asks for permission; accept it.
2. Have someone like something of yours, or insert a notification by hand.
3. It should arrive with uloggd closed.

If nothing arrives, look in this order:

- `select * from net.http_request_queue order by id desc limit 5` shows whether
  the database tried to call at all.
- `select * from net._http_response order by id desc limit 5` shows what the
  application answered. A 401 means the secret differs between steps 2 and 3.
- A 204 with nothing in the queue means the route ran but the recipient has no
  device registered.

## Platform notes

Android Chrome works without installing: it only asks for permission. iPhone
delivers push **only to a site installed to the home screen**; in a regular
Safari tab there is no subscription to make, and the settings card says so.

## What this does not decide

Notification preferences still choose which kinds are delivered. This only
decides whether a device can be reached at all. Preferences are per person,
the device list is per device, and a notification that preferences suppressed
never reaches the trigger in the first place.
