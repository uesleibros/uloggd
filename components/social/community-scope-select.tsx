"use client";

import * as Select from "@/components/ui/select";
import { Check, ChevronDown, Globe2, Lock, Users } from "lucide-react";
import { tri, type UiLang } from "@/lib/ui-text";

export type CommunityScope = "EVERYONE" | "FOLLOWERS" | "NOBODY";

export function CommunityScopeSelect({
  value,
  onChange,
  lang,
}: {
  value: CommunityScope;
  onChange: (value: CommunityScope) => void;
  lang: UiLang;
}) {
  const options = [
    {
      value: "EVERYONE" as const,
      label: tri(
        lang,
        "Todos podem comentar",
        "Anyone can comment",
        "Todos pueden comentar",
      ),
      icon: Globe2,
    },
    {
      value: "FOLLOWERS" as const,
      label: tri(
        lang,
        "Somente seguidores",
        "Followers only",
        "Solo seguidores",
      ),
      icon: Users,
    },
    {
      value: "NOBODY" as const,
      label: tri(
        lang,
        "Comentários fechados",
        "Comments closed",
        "Comentarios cerrados",
      ),
      icon: Lock,
    },
  ];
  const current = options.find((option) => option.value === value)!;
  return (
    <Select.Root
      value={value}
      onValueChange={(next) => onChange(next as CommunityScope)}
    >
      <Select.Trigger
        className="create-list-select"
        aria-label={tri(
          lang,
          "Privacidade dos comentários",
          "Comment privacy",
          "Privacidad de comentarios",
        )}
      >
        <current.icon size={15} />
        <Select.Value>{current.label}</Select.Value>
        <Select.Icon>
          <ChevronDown size={15} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="select-content"
          position="popper"
          sideOffset={6}
        >
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                className="select-item"
                value={option.value}
                key={option.value}
              >
                <option.icon size={15} />
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <Check size={14} />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
