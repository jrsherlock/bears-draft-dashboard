"use client";

import Image from "next/image";
import { useState } from "react";
import { initials, nameColor } from "@/lib/utils";
import type { DraftPick } from "@/lib/types";

type Props = {
  pick: DraftPick;
  size?: number;
  className?: string;
};

/**
 * Tries the ESPN headshot first (high-res), then Sleeper thumb, then falls
 * back to a stylized initials block colored deterministically by name.
 *
 * The fallback isn't a sad placeholder — it's a deliberate vintage draft-card
 * panel for the 1980s/90s players where no photo exists.
 */
export function PlayerAvatar({ pick, size = 64, className = "" }: Props) {
  // Prefer the self-hosted headshot (downloaded at build time) so we don't
  // depend on third-party CDNs at runtime. Fall back to remote URLs only
  // when we never managed to grab a local copy.
  const sources = [pick.local_photo, pick.photos?.espn, pick.photos?.sleeper]
    .filter(Boolean) as string[];
  const [idx, setIdx] = useState(0);
  const src = sources[idx];

  if (!src) {
    return <Initials name={pick.display_name} size={size} className={className} />;
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        background: nameColor(pick.display_name),
      }}
    >
      <Image
        src={src}
        alt={pick.display_name}
        width={size}
        height={size}
        unoptimized
        className="h-full w-full object-cover object-top"
        onError={() => {
          if (idx < sources.length - 1) setIdx(idx + 1);
          else setIdx(sources.length); // force fallback
        }}
      />
      {idx >= sources.length && (
        <Initials name={pick.display_name} size={size} className="absolute inset-0" />
      )}
    </div>
  );
}

function Initials({
  name,
  size,
  className = "",
}: {
  name: string;
  size: number;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        background: nameColor(name),
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(244,237,218,0.04) 0 6px, transparent 6px 12px)",
      }}
    >
      <span
        className="display text-cream-100/90"
        style={{ fontSize: size * 0.42 }}
      >
        {initials(name)}
      </span>
    </div>
  );
}
