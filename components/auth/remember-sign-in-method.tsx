"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  rememberSignInMethod,
  type SignInMethod,
} from "@/lib/last-sign-in-method";

/**
 * Records an OAuth sign-in once it has actually happened.
 *
 * The login page cannot do this itself. Pressing "continue with Discord"
 * leaves the site entirely, and whether it worked is only known after the
 * round trip lands somewhere else. Recording at click time would badge
 * whatever button somebody pressed before backing out of the provider's
 * consent screen, which is the wrong answer for the one person the badge
 * exists to help.
 *
 * Only OAuth. Email and passkey sign-ins are recorded by the login panel,
 * where success is directly observable; taking them from here as well would
 * relabel a passkey account as "email", since that is the provider the session
 * carries underneath.
 */
const OAUTH: readonly SignInMethod[] = ["google", "discord", "twitch"];

export function RememberSignInMethod() {
  useEffect(() => {
    let active = true;
    void createClient()
      .auth.getSession()
      .then(({ data }) => {
        const provider = data.session?.user.app_metadata?.provider;
        if (!active || !provider) return;
        if (OAUTH.includes(provider as SignInMethod))
          rememberSignInMethod(provider as SignInMethod);
      });
    return () => {
      active = false;
    };
  }, []);

  return null;
}
