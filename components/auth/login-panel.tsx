"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Fingerprint, LoaderCircle, ShieldCheck } from "lucide-react";
import type { Provider } from "@supabase/supabase-js";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";
import { createClient } from "@/lib/supabase/client";
import {
  DiscordIcon,
  GitHubIcon,
  GoogleIcon,
  TwitchIcon,
} from "./provider-icons";

const providers = [
  ["discord", "Discord", DiscordIcon],
  ["twitch", "Twitch", TwitchIcon],
  ["github", "GitHub", GitHubIcon],
  ["google", "Google", GoogleIcon],
] as const;

export function LoginPanel({
  lang,
  dictionary: d,
}: {
  lang: Locale;
  dictionary: Dictionary;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState<Provider | "passkey" | null>(null);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") ? d.auth.callbackError : null,
  );

  async function signInWithOAuth(provider: Provider, label: string) {
    setPending(provider);
    setError(null);
    const redirectTo = `${window.location.origin}/${lang}/auth/callback?next=/${lang}`;
    const { error: authError } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (authError) {
      setError(d.auth.oauthError.replace("{provider}", label));
      setPending(null);
    }
  }

  async function signInWithPasskey() {
    setPending("passkey");
    setError(null);
    if (!("PublicKeyCredential" in window)) {
      setError(d.auth.passkeyUnsupported);
      setPending(null);
      return;
    }

    const { error: authError } = await createClient().auth.signInWithPasskey();
    if (!authError) {
      router.replace(`/${lang}`);
      router.refresh();
      return;
    }

    setError(
      authError.code === "passkey_disabled"
        ? d.auth.passkeyDisabled
        : d.auth.passkeyCancelled,
    );
    setPending(null);
  }

  return (
    <section className="login-panel" aria-labelledby="login-title">
      <div className="login-panel-heading">
        <h1 id="login-title">{d.auth.title}</h1>
        <p>{d.auth.description}</p>
      </div>

      <button
        className="passkey-button"
        onClick={signInWithPasskey}
        disabled={pending !== null}
      >
        <span className="passkey-icon">
          {pending === "passkey" ? (
            <LoaderCircle className="spin" size={23} />
          ) : (
            <Fingerprint size={25} />
          )}
        </span>
        <span>
          <strong>
            {pending === "passkey"
              ? d.auth.passkeyLoading
              : d.auth.passkeyLabel}
          </strong>
          <small>{d.auth.passkeyHint}</small>
        </span>
      </button>

      <div className="auth-divider">
        <span>{d.auth.otherMethods}</span>
      </div>

      <div className="provider-grid">
        {providers.map(([provider, label, Icon]) => (
          <button
            key={provider}
            onClick={() => signInWithOAuth(provider, label)}
            disabled={pending !== null}
            aria-label={d.auth.continueWith.replace("{provider}", label)}
          >
            {pending === provider ? (
              <LoaderCircle className="spin" size={20} />
            ) : (
              <Icon />
            )}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="auth-error" role="alert">
          {error}
        </div>
      )}

      <div className="auth-assurance">
        <ShieldCheck size={16} />
        <span>
          <strong>{d.auth.secureAccess}</strong>
          {d.auth.privacyNote}
        </span>
      </div>

      <p className="auth-legal">
        {d.auth.legalPrefix}{" "}
        <Link href={`/${lang}/legal/terms`}>{d.legal.terms}</Link> {d.auth.and}{" "}
        <Link href={`/${lang}/legal/privacy`}>{d.legal.privacy}</Link>.
      </p>
    </section>
  );
}
