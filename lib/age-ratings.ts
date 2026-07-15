type RatingOrganization = {
  slug: "esrb" | "pegi" | "cero" | "usk" | "grac" | "class_ind" | "acb";
  name: string;
  region: string;
};

const MINIMUM_AGES: Record<
  RatingOrganization["slug"],
  Record<string, number>
> = {
  esrb: { e: 0, ec: 0, e10: 10, t: 13, m: 17, ao: 18, rp: 18 },
  pegi: { "3": 3, "7": 7, "12": 12, "16": 16, "18": 18 },
  cero: { a: 0, b: 12, c: 15, d: 17, z: 18 },
  usk: { "0": 0, "6": 6, "12": 12, "16": 16, "18": 18 },
  grac: { all: 0, "12": 12, "15": 15, "19": 19, testing: 19 },
  class_ind: { l: 0, "10": 10, "12": 12, "14": 14, "16": 16, "18": 18 },
  acb: { g: 0, pg: 8, m: 15, ma_15: 15, r_18: 18, rc: 18 },
};

const ORGANIZATIONS: Record<RatingOrganization["slug"], RatingOrganization> = {
  esrb: {
    slug: "esrb",
    name: "Entertainment Software Rating Board",
    region: "US/CA",
  },
  pegi: {
    slug: "pegi",
    name: "Pan European Game Information",
    region: "EU",
  },
  cero: {
    slug: "cero",
    name: "Computer Entertainment Rating Organization",
    region: "JP",
  },
  usk: {
    slug: "usk",
    name: "Unterhaltungssoftware Selbstkontrolle",
    region: "DE",
  },
  grac: {
    slug: "grac",
    name: "Game Rating and Administration Committee",
    region: "KR",
  },
  class_ind: {
    slug: "class_ind",
    name: "Classificação Indicativa",
    region: "BR",
  },
  acb: {
    slug: "acb",
    name: "Australian Classification Board",
    region: "AU",
  },
};

const AVAILABLE_RATINGS: Record<RatingOrganization["slug"], Set<string>> = {
  esrb: new Set(["e", "rp", "ec", "e10", "t", "m", "ao"]),
  pegi: new Set(["3", "7", "12", "16", "18"]),
  cero: new Set(["a", "b", "c", "d", "z"]),
  usk: new Set(["0", "6", "12", "16", "18"]),
  grac: new Set(["19", "all", "12", "15", "testing"]),
  class_ind: new Set(["l", "10", "12", "14", "16", "18"]),
  acb: new Set(["g", "pg", "m", "ma_15", "r_18", "rc"]),
};

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function organizationSlug(value: string): RatingOrganization["slug"] | null {
  const name = normalize(value);
  if (name.includes("class_ind") || name.includes("classificacao_indicativa"))
    return "class_ind";
  if (name.includes("esrb") || name.includes("entertainment_software_rating"))
    return "esrb";
  if (name.includes("pegi") || name.includes("pan_european_game"))
    return "pegi";
  if (name.includes("cero") || name.includes("computer_entertainment_rating"))
    return "cero";
  if (name.includes("usk") || name.includes("unterhaltungssoftware"))
    return "usk";
  if (name.includes("grac") || name.includes("game_rating_and_administration"))
    return "grac";
  if (name === "acb" || name.includes("australian_classification"))
    return "acb";
  return null;
}

function ratingSlug(organization: RatingOrganization["slug"], value: string) {
  let rating = normalize(value)
    .replace(/^pegi_/, "")
    .replace(/^cero_/, "")
    .replace(/^usk_/, "")
    .replace(/^grac_/, "")
    .replace(/^class_ind_/, "")
    .replace(/^acb_/, "")
    .replace(/^esrb_/, "");

  const numberWords: Record<string, string> = {
    zero: "0",
    three: "3",
    six: "6",
    seven: "7",
    ten: "10",
    twelve: "12",
    fourteen: "14",
    fifteen: "15",
    sixteen: "16",
    eighteen: "18",
    nineteen: "19",
  };
  rating = numberWords[rating] ?? rating;

  if (organization === "esrb") {
    if (rating === "everyone") rating = "e";
    if (rating === "everyone_10" || rating === "e_10") rating = "e10";
    if (rating === "teen") rating = "t";
    if (rating === "mature") rating = "m";
    if (rating === "adults_only") rating = "ao";
    if (rating === "rating_pending") rating = "rp";
    if (rating === "early_childhood") rating = "ec";
  }
  if (organization === "grac" && (rating === "18" || rating === "eighteen"))
    rating = "19";
  if (organization === "grac" && rating === "all_ages") rating = "all";
  if (organization === "class_ind" && (rating === "livre" || rating === "all"))
    rating = "l";
  if (organization === "acb" && rating === "ma15") rating = "ma_15";
  if (organization === "acb" && rating === "r18") rating = "r_18";

  return AVAILABLE_RATINGS[organization].has(rating) ? rating : null;
}

export function resolveAgeRating(organizationName: string, ratingName: string) {
  const slug = organizationSlug(organizationName);
  if (!slug) return null;
  const organization = ORGANIZATIONS[slug];
  const rating = ratingSlug(slug, ratingName);

  return {
    organization: organization.name,
    region: organization.region,
    rating: ratingName,
    minimumAge: rating ? MINIMUM_AGES[slug][rating] : null,
    imageUrl: rating ? `/age-ratings/${slug}/${slug}_${rating}.png` : null,
  };
}
