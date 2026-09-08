import { serverApi } from "@/lib/api-server";
import type {
  AccountProfile,
  AccountPeople,
  AccountState,
} from "@/lib/account-types";
import type { OwnAgeProfile } from "@/lib/own-age-profile";
import { notFound, redirect } from "next/navigation";
import { AccountSettings } from "@/components/settings/account-settings";
import { getAuthUser } from "@/lib/supabase/auth";
import { hasLocale } from "../dictionaries";

export default async function SettingsPage({
  params,
}: PageProps<"/[lang]/settings">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const user = await getAuthUser();
  if (!user) redirect(`/${lang}/login?next=/${lang}/settings?tab=general`);
  const [
    { data: profile },
    { data: age },
    { data: state },
    blockResult,
    requestResult,
    identitiesResult,
  ] = await Promise.all([
    serverApi.get<{ data: AccountProfile }>("/profile"),
    serverApi.get<{ data: OwnAgeProfile }>("/account/birth-date"),
    serverApi.get<AccountState>("/account/state"),
    serverApi.get<AccountPeople>("/social/blocks"),
    serverApi.get<AccountPeople>("/social/follow-requests"),
    serverApi.get<{ data: { provider: string }[] }>("/account/identities"),
  ]);
  if (!profile?.username) redirect(`/${lang}/onboarding/username`);
  return (
    <AccountSettings
      profile={{ ...profile, birth_date: age?.birth_date ?? null }}
      vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
      blockedProfiles={blockResult.data}
      followRequests={requestResult.data}
      blockedFetchedCount={(blockResult.data ?? []).length}
      requestsFetchedCount={(requestResult.data ?? []).length}
      blockedTotal={blockResult.page.total_items ?? 0}
      requestTotal={requestResult.page.total_items ?? 0}
      infractions={state.infractions}
      currentEmail={user.email}
      hasPassword={(
        (identitiesResult.data ?? []) as { provider: string }[]
      ).some((identity) => identity.provider === "email")}
      lang={lang}
    />
  );
}
