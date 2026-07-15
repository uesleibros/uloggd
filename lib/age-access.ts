function brazilDateParts(today: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(today);
  const get = (type: "year" | "month" | "day") =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function ageOnDate(birthDate: string, today = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (
    birth.getUTCFullYear() !== year ||
    birth.getUTCMonth() !== month - 1 ||
    birth.getUTCDate() !== day ||
    birth.getTime() > today.getTime() + 24 * 60 * 60 * 1000
  )
    return null;

  const accessDate = brazilDateParts(today);
  let age = accessDate.year - year;
  const beforeBirthday =
    accessDate.month < month ||
    (accessDate.month === month && accessDate.day < day);
  if (beforeBirthday) age -= 1;
  return age;
}

export function isOldEnough(birthDate: string, minimumAge: number) {
  const age = ageOnDate(birthDate);
  return age !== null && age >= minimumAge;
}

export function birthDateLimits(today = new Date()) {
  const { year, month, day } = brazilDateParts(today);
  const format = (targetYear: number) =>
    `${targetYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { min: format(year - 120), max: format(year - 12) };
}
