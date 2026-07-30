/**
 * Returns an HTML date-input value for the date in the viewer's local time.
 * `toISOString()` cannot be used for "today": it converts to UTC first and
 * advances the calendar after 21:00 in UTC-03.
 */
export function localDateKey(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
