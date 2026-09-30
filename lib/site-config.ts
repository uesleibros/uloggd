type SiteConfigInput = {
  siteUrl?: string;
  contactEmail?: string;
  supportEmail?: string;
};

/** Public addresses come from deployment configuration, never request headers. */
export function resolveSiteConfig(input: SiteConfigInput) {
  let url: URL;
  try {
    url = new URL(input.siteUrl?.trim() ?? "");
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be an absolute HTTP or HTTPS origin.",
    );
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be an HTTP or HTTPS origin without credentials, a path, query or fragment.",
    );

  const mailDomain = url.hostname.replace(/^www\./, "");
  const email = (value: string | undefined, fallback: string, key: string) => {
    const address = value?.trim() || fallback;
    if (!/^[^\s@?&#:]+@[a-z\d](?:[a-z\d.-]*[a-z\d])?$/i.test(address))
      throw new Error(`${key} must be a plain email address.`);
    return address;
  };
  return {
    siteUrl: url.origin,
    contactEmail: email(
      input.contactEmail,
      `contact@${mailDomain}`,
      "CONTACT_EMAIL",
    ),
    supportEmail: email(
      input.supportEmail,
      `suporte@${mailDomain}`,
      "SUPPORT_EMAIL",
    ),
  };
}

export function getSiteConfig() {
  return resolveSiteConfig({
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    contactEmail: process.env.CONTACT_EMAIL,
    supportEmail: process.env.SUPPORT_EMAIL,
  });
}

export function importUserAgent() {
  return `uloggd-partner-import/1.0 (+${getSiteConfig().siteUrl})`;
}
