"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";

export function ShareButton({
  title,
  text,
  label,
  copiedLabel,
  className,
}: {
  title: string;
  text: string;
  label: string;
  copiedLabel: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  return (
    <button
      className={className}
      type="button"
      onClick={share}
      aria-label={label}
    >
      {copied ? <Check size={15} /> : <Share2 size={15} />}
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
}
