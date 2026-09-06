"use client";

import { motion } from "motion/react";
import { useStill } from "@/lib/use-still";
import type { ReactNode } from "react";
import { EASE_OUT, MOTION_MS } from "@/lib/motion";

/**
 * Fades something in as it arrives.
 *
 * A client wrapper whose children stay server-rendered, so putting it around a
 * list item does not drag the item's markup into the browser bundle. That is
 * what makes it usable in the streams and lists that make up most of the site.
 *
 * `index` staggers a list without each caller inventing a delay. It is capped,
 * because a stagger that keeps growing means the last row of a long list waits
 * seconds for its turn, which stops being an entrance and becomes a wait.
 *
 * Honours `prefers-reduced-motion` by rendering the finished state with no
 * animation at all, rather than by animating faster.
 */
export function Reveal({
  children,
  index = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  index?: number;
  className?: string;
  /**
   * The element to render. A div is wrong inside a list, and a caller who
   * cannot say so ends up copying this component instead of using it, which
   * is how the durations drift apart.
   */
  as?: "div" | "li" | "section" | "article";
}) {
  const still = useStill();
  const Plain = as;
  const Animated = motion[as];
  if (still) return <Plain className={className}>{children}</Plain>;
  return (
    <Animated
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: MOTION_MS.quick / 1000,
        ease: EASE_OUT,
        delay: Math.min(index, 6) * 0.035,
      }}
    >
      {children}
    </Animated>
  );
}
