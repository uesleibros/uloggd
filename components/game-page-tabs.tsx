"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Images,
  Layers3,
  MessageSquare,
  Newspaper,
  Gamepad2,
} from "lucide-react";
import { SpawndLogo } from "./spawnd-logo";

type TabId =
  "overview" | "media" | "updates" | "related" | "spawnd" | "community";

export function GamePageTabs({
  lang,
  overview,
  media,
  updates,
  related,
  spawnd,
  community,
}: {
  lang: "pt-BR" | "en";
  overview: ReactNode;
  media?: ReactNode;
  updates?: ReactNode;
  related?: ReactNode;
  spawnd: ReactNode;
  community: ReactNode;
}) {
  const [active, setActive] = useState<TabId>("overview");
  const tabsRef = useRef<HTMLElement>(null);
  const pt = lang === "pt-BR";
  const tabs = [
    {
      id: "overview" as const,
      label: pt ? "Visão geral" : "Overview",
      icon: BookOpen,
      content: overview,
    },
    media
      ? {
          id: "media" as const,
          label: pt ? "Mídia" : "Media",
          icon: Images,
          content: media,
        }
      : null,
    updates
      ? {
          id: "updates" as const,
          label: pt ? "Atualizações" : "Updates",
          icon: Newspaper,
          content: updates,
        }
      : null,
    related
      ? {
          id: "related" as const,
          label: pt ? "Relacionados" : "Related",
          icon: Layers3,
          content: related,
        }
      : null,
    {
      id: "spawnd" as const,
      label: "Spawnd.gg",
      icon: Gamepad2,
      content: spawnd,
    },
    {
      id: "community" as const,
      label: pt ? "Comunidade" : "Community",
      icon: MessageSquare,
      content: community,
    },
  ].filter((tab): tab is NonNullable<typeof tab> => Boolean(tab));
  const selected = tabs.find((tab) => tab.id === active) ?? tabs[0];

  useEffect(() => {
    function openTab(event: Event) {
      const tab = (event as CustomEvent<TabId>).detail;
      if (!tabs.some((item) => item.id === tab)) return;
      setActive(tab);
      window.requestAnimationFrame(() => {
        tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        tabsRef.current
          ?.querySelector<HTMLButtonElement>(`#game-tab-${tab}`)
          ?.focus({ preventScroll: true });
      });
    }
    window.addEventListener("uloggd:open-game-tab", openTab);
    return () => window.removeEventListener("uloggd:open-game-tab", openTab);
  }, [tabs]);

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setActive(tabs[next].id);
    const buttons =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        "[role='tab']",
      );
    buttons?.[next]?.focus();
  }

  return (
    <section className="game-tabs" ref={tabsRef}>
      <div
        className="game-page-nav"
        role="tablist"
        aria-label={pt ? "Conteúdo do jogo" : "Game content"}
      >
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`game-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`game-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => navigate(event, index)}
            >
              {tab.id === "spawnd" ? (
                <SpawndLogo compact />
              ) : (
                <Icon size={15} />
              )}
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        key={selected.id}
        className="game-tab-panel"
        role="tabpanel"
        id={`game-panel-${selected.id}`}
        aria-labelledby={`game-tab-${selected.id}`}
        tabIndex={0}
      >
        {selected.content}
      </div>
    </section>
  );
}
