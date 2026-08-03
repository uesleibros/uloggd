"use client";

import { useMemo, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Search, Smile } from "lucide-react";
import { tri, type UiLang } from "@/lib/ui-text";

/**
 * A hand-picked set rather than the full Unicode table.
 *
 * The complete list is about 3,700 characters and needs its own search index,
 * category art and virtualised grid to be usable. This is the tail of that
 * distribution cut off: the ones people reach for on a games site, grouped, at
 * a size that renders instantly and ships as one array.
 *
 * `keywords` is what the filter searches, in all three languages, because
 * someone typing "coração" and someone typing "heart" want the same row.
 */
const GROUPS: {
  titlePt: string;
  titleEn: string;
  titleEs: string;
  emoji: [character: string, keywords: string][];
}[] = [
  {
    titlePt: "Rostos",
    titleEn: "Faces",
    titleEs: "Caras",
    emoji: [
      ["😀", "sorriso smile feliz happy"],
      ["😂", "chorando rindo laugh cry"],
      ["🥹", "emocionado touched"],
      ["😍", "amor love apaixonado"],
      ["🤩", "estrelas star struck"],
      ["😎", "oculos cool legal"],
      ["🥳", "festa party comemorar"],
      ["🤔", "pensando thinking duvida"],
      ["😴", "sono sleep dormindo"],
      ["😭", "chorando crying triste"],
      ["😤", "raiva bravo angry"],
      ["🤯", "explodindo mind blown"],
      ["🫠", "derretendo melting"],
      ["💀", "caveira skull morto dead"],
      ["👻", "fantasma ghost"],
      ["🤖", "robo robot bot"],
    ],
  },
  {
    titlePt: "Jogos",
    titleEn: "Games",
    titleEs: "Juegos",
    emoji: [
      ["🎮", "controle gamepad jogo game"],
      ["🕹️", "joystick arcade fliperama"],
      ["👾", "alien invader monstro"],
      ["🎯", "alvo target mira"],
      ["🏆", "trofeu trophy platina"],
      ["🥇", "ouro gold primeiro first"],
      ["🎲", "dado dice sorte"],
      ["🧩", "quebra cabeca puzzle"],
      ["⚔️", "espadas swords batalha"],
      ["🛡️", "escudo shield defesa"],
      ["🗡️", "espada sword"],
      ["🏹", "arco bow flecha"],
      ["💣", "bomba bomb"],
      ["🔫", "arma gun tiro"],
      ["🚀", "foguete rocket espaco"],
      ["🗺️", "mapa map mundo"],
    ],
  },
  {
    titlePt: "Reações",
    titleEn: "Reactions",
    titleEs: "Reacciones",
    emoji: [
      ["❤️", "coracao heart amor"],
      ["🧡", "coracao laranja orange heart"],
      ["💛", "coracao amarelo yellow heart"],
      ["💚", "coracao verde green heart"],
      ["💙", "coracao azul blue heart"],
      ["💜", "coracao roxo purple heart"],
      ["🔥", "fogo fire top"],
      ["✨", "brilho sparkles estrelas"],
      ["⭐", "estrela star nota"],
      ["💯", "cem cento perfeito hundred"],
      ["👏", "palmas clap aplauso"],
      ["👍", "joia thumbs up curti"],
      ["👎", "thumbs down nao"],
      ["🙌", "maos hands comemorar"],
      ["🤝", "aperto handshake acordo"],
      ["🫶", "coracao maos heart hands"],
    ],
  },
  {
    titlePt: "Objetos",
    titleEn: "Objects",
    titleEs: "Objetos",
    emoji: [
      ["📌", "alfinete pin fixado"],
      ["📖", "livro book leitura"],
      ["📝", "nota note escrever"],
      ["🔖", "marcador bookmark"],
      ["💾", "disquete save salvar"],
      ["💻", "notebook laptop pc"],
      ["📷", "camera foto photo"],
      ["🎬", "claquete movie filme"],
      ["🎵", "musica music nota"],
      ["🎨", "arte art paleta"],
      ["⏱️", "tempo timer horas"],
      ["📅", "calendario calendar data"],
      ["🔗", "link corrente"],
      ["⚠️", "aviso warning atencao"],
      ["✅", "check certo done feito"],
      ["❌", "erro cross errado"],
    ],
  },
];

/**
 * Inserts an emoji into the editor at the cursor.
 *
 * The literal character, not an image tag: the site converts emoji to twemoji
 * art at render time, so the document stays plain text and travels correctly
 * through the export, the database and anybody's clipboard.
 */
export function EmojiPicker({
  lang,
  onPick,
  disabled = false,
}: {
  lang: UiLang;
  onPick: (emoji: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return GROUPS;
    return GROUPS.map((group) => ({
      ...group,
      emoji: group.emoji.filter(
        ([character, keywords]) =>
          keywords.includes(normalized) || character.includes(normalized),
      ),
    })).filter((group) => group.emoji.length > 0);
  }, [query]);

  return (
    <Popover.Root>
      <Popover.Trigger
        className="md-insert-trigger"
        disabled={disabled}
        aria-label={tri(lang, "Emoji", "Emoji", "Emoji")}
      >
        <Smile size={16} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          className="emoji-picker-positioner"
          align="end"
          sideOffset={6}
          collisionPadding={12}
        >
          <Popover.Popup className="emoji-picker">
            <label className="emoji-picker-search">
              <Search size={14} aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={tri(lang, "Buscar", "Search", "Buscar")}
                aria-label={tri(
                  lang,
                  "Buscar emoji",
                  "Search emoji",
                  "Buscar emoji",
                )}
              />
            </label>
            <div className="emoji-picker-body">
              {groups.map((group) => (
                <section key={group.titleEn}>
                  <h4>
                    {tri(lang, group.titlePt, group.titleEn, group.titleEs)}
                  </h4>
                  <div>
                    {group.emoji.map(([character, keywords]) => (
                      <button
                        key={character}
                        type="button"
                        onClick={() => onPick(character)}
                        // `aria-label`, never `title`: the native tooltip is
                        // banned here and a test enforces it.
                        aria-label={keywords.split(" ")[0]}
                      >
                        {character}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
              {!groups.length && (
                <p className="emoji-picker-empty">
                  {tri(
                    lang,
                    "Nenhum emoji encontrado.",
                    "No emoji found.",
                    "Ningún emoji encontrado.",
                  )}
                </p>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
