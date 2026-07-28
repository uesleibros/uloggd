"use client";

import * as Dialog from "@/components/ui/dialog";
import * as DropdownMenu from "@/components/ui/dropdown-menu";
import * as Select from "@/components/ui/select";
import {
  Check,
  ChevronDown,
  Flag,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { reportReasonIcon } from "@/lib/report-reasons";
import { tri, uiText, type UiLang } from "@/lib/ui-text";
import { CommunityTextArea } from "./comment-parts";
import {
  EditorVisibilitySelect,
  type ReviewVisibility,
} from "./review-studio-form";

export function ScreenshotActions({
  shot,
  viewerId,
  lang,
}: {
  shot: {
    id: string;
    publicId: string;
    ownerId: string;
    ownerUsername: string;
    description: string;
    spoilers: boolean;
    visibility: ReviewVisibility;
  };
  viewerId: string | null;
  lang: UiLang;
}) {
  const t = uiText(lang);
  const router = useRouter();
  const owner = viewerId === shot.ownerId;
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [description, setDescription] = useState(shot.description);
  const [spoilers, setSpoilers] = useState(shot.spoilers);
  const [visibility, setVisibility] = useState(shot.visibility);
  const [pending, setPending] = useState(false);
  const [armed, setArmed] = useState(false);
  const [reportReason, setReportReason] = useState("OTHER");
  const [reportDetails, setReportDetails] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    const { error: updateError } = await createClient()
      .from("screenshots")
      .update({
        description: description.trim() || null,
        contains_spoilers: spoilers,
        visibility,
      })
      .eq("id", shot.id);
    if (updateError) setError(t.couldNotSave);
    else {
      setEditing(false);
      router.refresh();
    }
    setPending(false);
  }
  async function remove() {
    if (!armed) {
      setArmed(true);
      window.setTimeout(() => setArmed(false), 4000);
      return;
    }
    setPending(true);
    setError(null);
    const response = await fetch(
      `/api/screenshots?id=${encodeURIComponent(shot.id)}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      setError(t.couldNotRemove);
      setPending(false);
      return;
    }
    router.push(`/${lang}/u/${shot.ownerUsername}/shots`);
    router.refresh();
  }
  async function report() {
    if (!viewerId) return;
    setPending(true);
    setError(null);
    const { error: reportError } = await createClient()
      .from("reports")
      .insert({
        reporter_id: viewerId,
        target_profile_id: shot.ownerId,
        content_type: "SCREENSHOT",
        content_id: shot.id,
        reason: reportReason,
        details: reportDetails.trim() || null,
      });
    if (reportError)
      setError(
        tri(
          lang,
          "Não foi possível enviar a denúncia.",
          "Could not send the report.",
          "No se pudo enviar la denuncia.",
        ),
      );
    else setReporting(false);
    setPending(false);
  }
  if (!viewerId) return null;
  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="screenshot-more-action"
            type="button"
            aria-label={tri(lang, "Mais ações", "More actions", "Más acciones")}
          >
            <MoreHorizontal size={18} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="profile-comment-action-menu"
            align="end"
            sideOffset={6}
          >
            {owner ? (
              <>
                <DropdownMenu.Item onSelect={() => setEditing(true)}>
                  <Pencil size={14} /> {t.edit}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  data-danger
                  onSelect={(event) => {
                    if (!armed) event.preventDefault();
                    void remove();
                  }}
                >
                  <Trash2 size={14} />{" "}
                  {armed
                    ? tri(
                        lang,
                        "Excluir mesmo?",
                        "Really delete?",
                        "¿Eliminar de verdad?",
                      )
                    : t.delete}
                </DropdownMenu.Item>
              </>
            ) : (
              <DropdownMenu.Item onSelect={() => setReporting(true)}>
                <Flag size={14} />{" "}
                {tri(
                  lang,
                  "Denunciar captura",
                  "Report screenshot",
                  "Denunciar captura",
                )}
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <Dialog.Root open={editing} onOpenChange={setEditing}>
        <Dialog.Portal>
          <Dialog.Overlay className="drawer-backdrop" />
          <Dialog.Content
            className="social-editor-dialog screenshot-edit-dialog"
            aria-describedby={undefined}
          >
            <header>
              <Dialog.Title>
                {tri(
                  lang,
                  "Editar captura",
                  "Edit screenshot",
                  "Editar captura",
                )}
              </Dialog.Title>
              <Dialog.Close aria-label={t.close}>
                <X size={18} />
              </Dialog.Close>
            </header>
            <form action={save} className="social-editor-form">
              <CommunityTextArea
                id="edit-screenshot-description"
                label={tri(lang, "Descrição", "Description", "Descripción")}
                value={description}
                onChange={setDescription}
                maxLength={1000}
                rows={4}
                placeholder={tri(
                  lang,
                  "Conte o contexto da captura…",
                  "Add context to the screenshot…",
                  "Añade contexto a la captura…",
                )}
              />
              <label>
                <span>{t.visibility}</span>
                <EditorVisibilitySelect
                  value={visibility}
                  onChange={setVisibility}
                  lang={lang}
                />
              </label>
              <label className="social-check">
                <input
                  type="checkbox"
                  checked={spoilers}
                  onChange={(event) => setSpoilers(event.target.checked)}
                />
                <span>{t.containsSpoilers}</span>
              </label>
              {error && (
                <p className="social-form-error" role="alert">
                  {error}
                </p>
              )}
              <footer>
                <Dialog.Close type="button">{t.cancel}</Dialog.Close>
                <button type="submit" disabled={pending}>
                  {pending && <LoaderCircle className="spin" size={14} />}{" "}
                  {t.save}
                </button>
              </footer>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={reporting} onOpenChange={setReporting}>
        <Dialog.Portal>
          <Dialog.Overlay className="report-dialog-overlay" />
          <Dialog.Content
            className="report-dialog screenshot-report-dialog"
            aria-describedby={undefined}
          >
            <header>
              <div>
                <Dialog.Title>
                  {tri(
                    lang,
                    "Denunciar captura",
                    "Report screenshot",
                    "Denunciar captura",
                  )}
                </Dialog.Title>
              </div>
              <Dialog.Close aria-label={t.close}>
                <X size={18} />
              </Dialog.Close>
            </header>
            <form action={report}>
              <label>
                {tri(lang, "Motivo", "Reason", "Motivo")}
                <Select.Root
                  value={reportReason}
                  onValueChange={setReportReason}
                >
                  <Select.Trigger className="editor-select-trigger screenshot-report-trigger">
                    <Select.Value />
                    <Select.Icon>
                      <ChevronDown size={14} />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      className="editor-select-menu screenshot-report-menu"
                      position="popper"
                      sideOffset={6}
                      collisionPadding={12}
                    >
                      <Select.Viewport>
                        {[
                          [
                            "HARASSMENT",
                            tri(lang, "Assédio", "Harassment", "Acoso"),
                          ],
                          [
                            "HATE_SPEECH",
                            tri(
                              lang,
                              "Discurso de ódio",
                              "Hate speech",
                              "Discurso de odio",
                            ),
                          ],
                          [
                            "SEXUAL_CONTENT",
                            tri(
                              lang,
                              "Conteúdo sexual",
                              "Sexual content",
                              "Contenido sexual",
                            ),
                          ],
                          ["OTHER", tri(lang, "Outro", "Other", "Otro")],
                        ].map(([value, label]) => {
                          const Icon = reportReasonIcon(value);
                          return (
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
                          );
                        })}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </label>
              <CommunityTextArea
                id="screenshot-report-details"
                label={tri(
                  lang,
                  "Detalhes (opcional)",
                  "Details (optional)",
                  "Detalles (opcional)",
                )}
                value={reportDetails}
                onChange={setReportDetails}
                maxLength={1000}
                rows={3}
                placeholder={tri(
                  lang,
                  "Ajude a moderação a entender o problema…",
                  "Help moderation understand the issue…",
                  "Ayuda a moderación a entender el problema…",
                )}
              />
              {error && (
                <p className="social-form-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" disabled={pending}>
                {pending && <LoaderCircle className="spin" size={15} />}
                {tri(lang, "Enviar denúncia", "Send report", "Enviar denuncia")}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
