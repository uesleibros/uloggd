import {
  HomeIcon,
  Images,
  NotebookPen,
  LibraryBig,
  ListTree,
  Search,
  Settings,
  ShieldCheck,
  Star,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * One icon per navigation destination, shared by the sidebar and the overflow
 * menu.
 *
 * They kept separate copies of this, and the copies drifted: the sidebar looked
 * items up by `icon` while the menu looked them up by `key`, so an entry added
 * to one map was missing from the other and fell through to the settings gear.
 * Screenshots shipped that way, showing a cog in the "More" menu.
 *
 * Keyed by the icon name rather than the item key, since two items can want the
 * same picture and none should have to know what the other is called.
 */
export const NAVIGATION_ICONS: Record<string, LucideIcon> = {
  home: HomeIcon,
  search: Search,
  library: LibraryBig,
  profile: UserRound,
  star: Star,
  list: ListTree,
  journal: NotebookPen,
  shots: Images,
  wallet: Wallet,
  moderation: ShieldCheck,
  settings: Settings,
};

/**
 * The gear is the fallback because it is the least wrong thing to show for an
 * unknown destination, not because it is right. A missing entry is a bug, and
 * a test asserts every navigation item resolves to one.
 */
export const NAVIGATION_ICON_FALLBACK = Settings;
