"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SocialEntry } from "./activity-stream";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import {
  ReviewStudioForm,
  type ReviewFormInitial,
  type ReviewRpcFields,
} from "./review-studio-form";

export function EditReviewDialog({
  entry,
  lang,
  open,
  onOpenChange,
}: {
  entry: SocialEntry;
  lang: UiLang;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = uiText(lang);
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const initial: ReviewFormInitial = {
    rating: typeof entry.rating === "number" ? entry.rating : null,
    ratingMode: entry.ratingMode ?? "stars_5",
    recommended: entry.recommended ?? null,
    content: entry.content ?? "",
    spoilers: entry.spoilers,
    visibility: entry.visibility,
    title: entry.title ?? "",
    mastered: entry.mastered ?? false,
    replay: entry.replay ?? false,
    startedOn: entry.startedOn ?? "",
    finishedOn: entry.finishedOn ?? "",
    platform: entry.platform ?? "",
    journeyId: entry.journeyId ?? null,
    aspects: (entry.aspects ?? []).map((aspect, index) => ({
      id: `${entry.id}-${index}`,
      label: aspect.label,
      rating: aspect.rating,
      note: aspect.note ?? "",
      custom: Boolean(aspect.custom),
    })),
  };

  async function perform(fields: ReviewRpcFields) {
    setPending(true);
    const { error } = await createClient().rpc("update_review", {
      review_id: entry.id,
      ...fields,
    });
    if (!error) {
      router.refresh();
      window.setTimeout(() => onOpenChange(false), 420);
    }
    setPending(false);
    return !error;
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-backdrop" />
        <Dialog.Content
          className="social-editor-dialog review-studio-dialog"
          aria-describedby={undefined}
        >
          <header>
            <div>
              <span>
                {tri(lang, "Editar avaliação", "Edit review", "Editar reseña")}
              </span>
              <Dialog.Title>{entry.game?.name ?? entry.gameSlug}</Dialog.Title>
            </div>
            <Dialog.Close aria-label={t.close} disabled={pending}>
              <X size={19} />
            </Dialog.Close>
          </header>
          <ReviewStudioForm
            lang={lang}
            platforms={entry.platform ? [entry.platform] : []}
            journeyOptions={
              entry.journeyId
                ? [
                    {
                      id: entry.journeyId,
                      title:
                        entry.journeyTitle ??
                        tri(lang, "Jornada", "Journey", "Recorrido"),
                    },
                  ]
                : []
            }
            initial={initial}
            submitLabel={tri(
              lang,
              "Salvar alterações",
              "Save changes",
              "Guardar cambios",
            )}
            busyLabel={t.saving}
            successLabel={tri(
              lang,
              "Avaliação atualizada.",
              "Review updated.",
              "Reseña actualizada.",
            )}
            onPerform={perform}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
