import Image from "next/image";
import type { ReactNode } from "react";

export type WorkspaceProfile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
};

/**
 * Personal-workspace hero shared by /lists and /reviews, following the
 * library pattern: the owner's banner as a dimmed backdrop, scrim, avatar,
 * eyebrow + title + description, and a frosted stats block anchored to the
 * bottom edge.
 */
export function WorkspaceHero({
  profile,
  eyebrow,
  title,
  description,
  stats,
  children,
}: {
  profile: WorkspaceProfile;
  eyebrow: ReactNode;
  title: string;
  description: string;
  stats: Array<{ icon: ReactNode; label: string; value: ReactNode }>;
  children?: ReactNode;
}) {
  return (
    <header className="workspace-hero">
      {profile.banner_url && (
        <Image
          src={profile.banner_url}
          alt=""
          fill
          priority
          sizes="1200px"
          unoptimized
        />
      )}
      <div className="workspace-hero-scrim" />
      <div className="workspace-hero-content">
        <div className="workspace-hero-avatar">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              fill
              sizes="64px"
              unoptimized
            />
          ) : (
            profile.username.slice(0, 1).toUpperCase()
          )}
        </div>
        <div className="workspace-hero-copy">
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          {children}
        </div>
        <dl className="workspace-hero-stats">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt>
                {stat.icon} {stat.label}
              </dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}
