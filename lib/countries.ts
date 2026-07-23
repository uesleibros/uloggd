import type { UiLang } from "@/lib/ui-text";

/**
 * IGDB stores a company's country as an ISO 3166-1 *numeric* code, which no
 * browser API accepts directly. Mapping it to alpha-2 lets Intl.DisplayNames
 * produce the localized name, so a country reads "Japão" / "Japan" / "Japón"
 * without three hand-written tables.
 *
 * The list covers the countries that actually appear on game companies; an
 * unmapped code simply hides the field rather than printing a number.
 */
const ISO_NUMERIC_TO_ALPHA2: Record<number, string> = {
  32: "AR",
  36: "AU",
  40: "AT",
  56: "BE",
  76: "BR",
  100: "BG",
  124: "CA",
  152: "CL",
  156: "CN",
  158: "TW",
  170: "CO",
  188: "CR",
  191: "HR",
  196: "CY",
  203: "CZ",
  208: "DK",
  218: "EC",
  233: "EE",
  246: "FI",
  250: "FR",
  268: "GE",
  276: "DE",
  300: "GR",
  344: "HK",
  348: "HU",
  352: "IS",
  356: "IN",
  360: "ID",
  372: "IE",
  376: "IL",
  380: "IT",
  392: "JP",
  400: "JO",
  404: "KE",
  410: "KR",
  428: "LV",
  440: "LT",
  442: "LU",
  458: "MY",
  470: "MT",
  484: "MX",
  528: "NL",
  554: "NZ",
  566: "NG",
  578: "NO",
  586: "PK",
  591: "PA",
  604: "PE",
  608: "PH",
  616: "PL",
  620: "PT",
  642: "RO",
  643: "RU",
  682: "SA",
  688: "RS",
  702: "SG",
  703: "SK",
  705: "SI",
  710: "ZA",
  724: "ES",
  752: "SE",
  756: "CH",
  764: "TH",
  784: "AE",
  792: "TR",
  804: "UA",
  807: "MK",
  818: "EG",
  826: "GB",
  840: "US",
  858: "UY",
  862: "VE",
  704: "VN",
};

const LOCALE: Record<UiLang, string> = {
  "pt-BR": "pt-BR",
  en: "en",
  es: "es",
};

export function countryFromIgdb(code: number | null | undefined, lang: UiLang) {
  if (typeof code !== "number") return null;
  const alpha2 = ISO_NUMERIC_TO_ALPHA2[code];
  if (!alpha2) return null;
  try {
    const names = new Intl.DisplayNames([LOCALE[lang]], { type: "region" });
    return { code: alpha2, name: names.of(alpha2) ?? alpha2 };
  } catch {
    return { code: alpha2, name: alpha2 };
  }
}

/** Regional-indicator pair — renders as the country's flag emoji. */
export function flagEmoji(alpha2: string) {
  return String.fromCodePoint(
    ...[...alpha2.toUpperCase()].map((char) => 0x1f1a5 + char.charCodeAt(0)),
  );
}
