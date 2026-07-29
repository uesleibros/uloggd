export function navigationPathIsActive(pathname: string, href: string) {
  const target = href.split("?", 1)[0].replace(/\/$/, "") || "/";
  const current = pathname.replace(/\/$/, "") || "/";
  if (target.split("/").filter(Boolean).length === 1) return current === target;
  return current === target || current.startsWith(`${target}/`);
}

export function sidebarDirectItemCapacity(height: number, itemCount: number) {
  // Brand, section label, create action, account identity, and their gutters
  // consume about 276px. Reserve one row for More when destinations overflow.
  const availableSlots = Math.max(4, Math.floor((height - 276) / 55));
  if (availableSlots >= itemCount) return itemCount;
  return Math.min(itemCount, Math.max(3, availableSlots - 1));
}
