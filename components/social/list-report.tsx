"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@/components/ui/select";
import {
  Check,
  ChevronDown,
  CircleHelp,
  EyeOff,
  Flag,
  LoaderCircle,
  Megaphone,
  MessageSquareWarning,
  UserX,
  X,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tri, uiText, type UiLang } from "@/lib/ui-text";

/**
 * Report control for a list (collection or tierlist). Reports carry
 * content_type 'LIST', which the moderation console already renders as a
 * generic content report. Only shown to a signed-in non-owner.
 */
export function ListReport({
  listId,
  ownerId,
  lang,
}: {
  listId: string;
  ownerId: string;
  lang: UiLang;
}) {
  const t = uiText(lang);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("OTHER");
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (pending) return;
    setPending(true);
    setError(null);
    const { error: reportError } = await createClient()
      .from("reports")
      .insert({
        target_profile_id: ownerId,
        content_type: "LIST",
        content_id: listId,
        reason,
        details: details.trim() || null,
      });
    if (reportError) {
      setError(
        tri(
          lang,
          "Não foi possível enviar a denúncia.",
          "Could not send the report.",
          "No se pudo enviar la denuncia.",
        ),
      );
      setPending(false);
      return;
    }
    setDone(true);
    setPending(false);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setDone(false);
          setError(null);
          setDetails("");
          setReason("OTHER");
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button type="button" className="list-report-trigger">
          <Flag size={14} aria-hidden />
          {tri(lang, "Denunciar", "Report", "Denunciar")}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="drawer-backdrop" />
        <Dialog.Content className="social-editor-dialog list-report-dialog">
          <header>
            <div>
              <span>{tri(lang, "MODERAÇÃO", "MODERATION", "MODERACIÓN")}</span>
              <Dialog.Title>
                {tri(lang, "Denunciar lista", "Report list", "Denunciar lista")}
              </Dialog.Title>
              <Dialog.Description>
                {tri(
                  lang,
                  "A equipe de moderação vai analisar.",
                  "The moderation team will review it.",
                  "El equipo de moderación lo revisará.",
                )}
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label={t.close}>
              <X size={19} />
            </Dialog.Close>
          </header>
          {done ? (
            <div className="list-report-done">
              <Check size={22} aria-hidden />
              <p>
                {tri(
                  lang,
                  "Denúncia enviada. Obrigado.",
                  "Report sent. Thank you.",
                  "Denuncia enviada. Gracias.",
                )}
              </p>
              <Dialog.Close className="list-report-done-close">
                {t.close}
              </Dialog.Close>
            </div>
          ) : (
            <div className="social-editor-form">
              <label>
                <span>{tri(lang, "Motivo", "Reason", "Motivo")}</span>
                <Select.Root value={reason} onValueChange={setReason}>
                  <Select.Trigger className="editor-select-trigger">
                    <Select.Value />
                    <Select.Icon>
                      <ChevronDown size={14} />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      className="editor-select-menu"
                      position="popper"
                      sideOffset={6}
                      collisionPadding={12}
                    >
                      <Select.Viewport>
                        {(
                          [
                            [
                              "HARASSMENT",
                              tri(lang, "Assédio", "Harassment", "Acoso"),
                              UserX,
                            ],
                            [
                              "HATE_SPEECH",
                              tri(
                                lang,
                                "Discurso de ódio",
                                "Hate speech",
                                "Discurso de odio",
                              ),
                              MessageSquareWarning,
                            ],
                            [
                              "SEXUAL_CONTENT",
                              tri(
                                lang,
                                "Conteúdo sexual",
                                "Sexual content",
                                "Contenido sexual",
                              ),
                              EyeOff,
                            ],
                            [
                              "SPAM",
                              tri(lang, "Spam", "Spam", "Spam"),
                              Megaphone,
                            ],
                            [
                              "OTHER",
                              tri(lang, "Outro", "Other", "Otro"),
                              CircleHelp,
                            ],
                          ] as const
                        ).map(([value, label, Icon]) => (
                          <Select.Item
                            className="editor-select-option"
                            value={value}
                            key={value}
                          >
                            <Icon size={14} />
                            <Select.ItemText>{label}</Select.ItemText>
                            <Select.ItemIndicator>
                              <Check size={13} />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </label>
              <label>
                <span>
                  {tri(
                    lang,
                    "Detalhes (opcional)",
                    "Details (optional)",
                    "Detalles (opcional)",
                  )}
                </span>
                <textarea
                  value={details}
                  maxLength={500}
                  rows={3}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder={tri(
                    lang,
                    "O que há de errado com esta lista?",
                    "What is wrong with this list?",
                    "¿Qué problema tiene esta lista?",
                  )}
                />
              </label>
              {error && (
                <p className="social-form-error" role="alert">
                  {error}
                </p>
              )}
              <footer>
                <Dialog.Close type="button">{t.cancel}</Dialog.Close>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void submit()}
                >
                  {pending && (
                    <LoaderCircle className="spin" size={15} aria-hidden />
                  )}
                  {tri(
                    lang,
                    "Enviar denúncia",
                    "Send report",
                    "Enviar denuncia",
                  )}
                </button>
              </footer>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
