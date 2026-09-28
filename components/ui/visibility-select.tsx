"use client";

import { Check, ChevronDown, Globe2, Lock, Users } from "lucide-react";
import * as Select from "@/components/ui/select";
import {
  VISIBILITIES,
  visibilityLabel,
  type Visibility,
} from "@/lib/visibility";
import type { UiLang } from "@/lib/ui-text";

/**
 * The mark that says which answer is in force, wherever one is drawn without
 * the select: a globe, the people who follow you, a lock.
 */
export const VISIBILITY_MARKS = {
  PUBLIC: Globe2,
  FOLLOWERS: Users,
  PRIVATE: Lock,
} as const;

/**
 * Who can see this: the one control for the one question.
 *
 * It lived inside the review composer, a twelve-hundred-line form, and five
 * other screens imported it from there; the screenshot composer gave up and
 * built its own out of the same Radix parts, with different icons and
 * differently spelled labels. It belongs here, next to the other controls.
 */
export function VisibilitySelect({
  value,
  onChange,
  lang,
  name = "visibility",
}: {
  value: Visibility;
  onChange?: (value: Visibility) => void;
  lang: UiLang;
  /** The field name, for the composers that post a plain form. */
  name?: string;
}) {
  return (
    <Select.Root
      name={name}
      value={value}
      onValueChange={(next) => onChange?.(next as Visibility)}
    >
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
            {VISIBILITIES.map((option) => {
              const Mark = VISIBILITY_MARKS[option];
              return (
                <Select.Item
                  className="editor-select-option"
                  key={option}
                  value={option}
                >
                  <Mark size={14} />
                  <Select.ItemText>
                    {visibilityLabel(option, lang)}
                  </Select.ItemText>
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
  );
}
