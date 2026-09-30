import assert from "node:assert/strict";
import test from "node:test";
import { resolveSiteConfig } from "../../lib/site-config.ts";

test("public addresses follow the configured origin, including a different domain", () => {
  assert.deepEqual(
    resolveSiteConfig({ siteUrl: " https://www.example.org/ " }),
    {
      siteUrl: "https://www.example.org",
      contactEmail: "contact@example.org",
      supportEmail: "suporte@example.org",
    },
  );
});

test("contact and appeal mailboxes can be configured independently of the domain", () => {
  const config = resolveSiteConfig({
    siteUrl: "http://localhost:3100",
    contactEmail: " contact@example.org ",
    supportEmail: "appeals@example.net",
  });
  assert.equal(config.siteUrl, "http://localhost:3100");
  assert.equal(config.contactEmail, "contact@example.org");
  assert.equal(config.supportEmail, "appeals@example.net");
});

test("a missing or invalid public origin cannot silently build broken links", () => {
  for (const siteUrl of [
    undefined,
    "",
    "example.org",
    "ftp://example.org",
    "https://name:secret@example.org",
    "https://example.org/path",
    "https://example.org/?x=1",
    "https://example.org/#x",
  ]) {
    assert.throws(() => resolveSiteConfig({ siteUrl }), /NEXT_PUBLIC_SITE_URL/);
  }
});

test("email configuration cannot inject mailto parameters or header characters", () => {
  for (const value of [
    "a@example.org?body=oops",
    "a@example.org&cc=b@example.org",
    "a@example.org\r\nCc: b@example.org",
    "mailto:a@example.org",
    "not-an-email",
  ]) {
    assert.throws(
      () =>
        resolveSiteConfig({
          siteUrl: "https://example.org",
          contactEmail: value,
        }),
      /CONTACT_EMAIL/,
    );
    assert.throws(
      () =>
        resolveSiteConfig({
          siteUrl: "https://example.org",
          supportEmail: value,
        }),
      /SUPPORT_EMAIL/,
    );
  }
});
