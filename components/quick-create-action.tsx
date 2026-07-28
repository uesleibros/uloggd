"use client";

import * as DropdownMenu from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { BookOpen, LockKeyhole, Plus, ScanLine } from "lucide-react";
import { tri, type UiLang } from "@/lib/ui-text";

export function QuickCreateAction({
  lang,
  enabled,
  mobile = false,
  requiresSignIn,
}: {
  lang: UiLang;
  enabled: boolean;
  mobile?: boolean;
  requiresSignIn: string;
}) {
  const createLabel = tri(lang, "Criar", "Create", "Crear");
  const reviewLabel = tri(
    lang,
    "Avaliar um jogo",
    "Review a game",
    "Reseñar un juego",
  );

  return (
    <div
      className={`quick-create${mobile ? " quick-create-mobile" : " quick-create-sidebar"}`}
    >
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild disabled={!enabled}>
          <button
            type="button"
            className="quick-create-trigger"
            aria-label={enabled ? createLabel : requiresSignIn}
            title={!enabled ? requiresSignIn : undefined}
          >
            <Plus size={mobile ? 25 : 20} aria-hidden />
            {!mobile && <span>{createLabel}</span>}
            {!enabled && !mobile && <LockKeyhole size={12} aria-hidden />}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="quick-create-menu"
            side={mobile ? "top" : "right"}
            align={mobile ? "end" : "start"}
            sideOffset={mobile ? 10 : 12}
            collisionPadding={12}
          >
            <DropdownMenu.Label>
              {tri(lang, "Novo registro", "New entry", "Nuevo registro")}
            </DropdownMenu.Label>
            <DropdownMenu.Item asChild>
              <Link href={`/${lang}/search?create=review`}>
                <span className="quick-create-menu-icon" aria-hidden>
                  <BookOpen size={18} />
                </span>
                <span>
                  <strong>{reviewLabel}</strong>
                  <small>
                    {tri(
                      lang,
                      "Escolha o jogo e escreva sua experiência",
                      "Choose a game and share your experience",
                      "Elige el juego y comparte tu experiencia",
                    )}
                  </small>
                </span>
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link href={`/${lang}/search?create=screenshot`}>
                <span className="quick-create-menu-icon" aria-hidden>
                  <ScanLine size={18} />
                </span>
                <span>
                  <strong>
                    {tri(
                      lang,
                      "Captura de tela",
                      "Screenshot",
                      "Captura de pantalla",
                    )}
                  </strong>
                  <small>
                    {tri(
                      lang,
                      "Publique um momento do seu jogo",
                      "Share a moment from your game",
                      "Comparte un momento de tu juego",
                    )}
                  </small>
                </span>
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Arrow className="quick-create-arrow" />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
