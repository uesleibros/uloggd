"use client";

import { useEffect } from "react";

const ATTRIBUTE = "data-sidebar-collapsed";
const STORAGE_KEY = "uloggd_sidebar_collapsed";

/**
 * Folds the site's own sidebar away while the documentation is open.
 *
 * The reference has a sidebar of its own, and two of them on one screen leaves
 * the page it is all for about half the width. This uses the collapsed state
 * the site already has, so nothing new decides what the shell looks like.
 *
 * It never writes to storage. Leaving restores whatever the reader had chosen,
 * which is read back rather than remembered, and the collapse button keeps
 * working while they are here: this sets the state once and then stops, so
 * reopening the sidebar on a documentation page stays open.
 */
export function CollapseAppSidebar() {
  useEffect(() => {
    const root = document.documentElement;
    const collapse = () => root.toggleAttribute(ATTRIBUTE, true);

    collapse();
    // The site restores this attribute from storage in its own timeout, which
    // on a cold load lands after this effect and undoes it. Holding the state
    // for a moment is what wins that, and letting go afterwards is what keeps
    // the collapse button working: reopening the sidebar here stays open.
    const guard = new MutationObserver(collapse);
    guard.observe(root, { attributes: true, attributeFilter: [ATTRIBUTE] });
    const release = window.setTimeout(() => guard.disconnect(), 1200);

    return () => {
      window.clearTimeout(release);
      guard.disconnect();
      let preferred = false;
      try {
        preferred = window.localStorage.getItem(STORAGE_KEY) === "true";
      } catch {
        // No storage means the site's own default, which is expanded.
      }
      root.toggleAttribute(ATTRIBUTE, preferred);
    };
  }, []);

  return null;
}
