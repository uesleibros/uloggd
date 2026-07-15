"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { useState } from "react";
import {
  BookOpen,
  Images,
  Layers3,
  MessageSquare,
  Newspaper,
  Gamepad2,
} from "lucide-react";

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
    <section className="game-tabs">
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
              <Icon size={15} />
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
