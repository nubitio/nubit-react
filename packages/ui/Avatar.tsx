import React from 'react';
import './Avatar.scss';

// ---------------------------------------------------------------------------
// Avatar — initials-based avatar with deterministic color from owner string.
//
// Renders as a DOM element (not an SVG data URI) so all styles correctly
// consume CSS custom properties, including theme tokens and dark mode.
//
// Usage:
//   <Avatar owner="John Doe" size={32} />
//   <Avatar owner="Jane" size={24} shape="square" />
// ---------------------------------------------------------------------------

/**
 * 8 semantic hues aligned with the Fluent / @nubitio design palette.
 * Expressed as HSL so the lightness can be adjusted for dark mode via CSS.
 * The color is set as --avatar-hue on the element and consumed in Avatar.scss.
 */
const AVATAR_HUES = [218, 148, 262, 192, 36, 203, 22, 340] as const;

export type AvatarShape = 'circle' | 'square';
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  /**
   * The name used to derive initials and background color.
   * Initials are extracted from up to the first two words.
   */
  owner?: string;
  /**
   * Explicit size in px. If not provided, uses one of the named sizes.
   * Named sizes: xs=20, sm=24, md=32, lg=40, xl=48.
   */
  size?: number;
  /** Named size variant — overridden by explicit `size` prop. */
  variant?: AvatarSize;
  /** Circle (default) or rounded-square. */
  shape?: AvatarShape;
  /** Optional alt text. Defaults to owner name or "Avatar". */
  alt?: string;
  className?: string;
}

const NAMED_SIZES: Record<AvatarSize, number> = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 48,
};

export function getAvatarInitials(owner = ''): string {
  const normalized = owner.trim();
  if (!normalized) return 'NA';
  const words = normalized.split(/\s+/);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return normalized.slice(0, 2).toUpperCase();
}

export function getAvatarHue(owner = ''): number {
  let hash = 0;
  for (let i = 0; i < owner.length; i++) {
    hash = (hash * 31 + owner.charCodeAt(i)) & 0xfffffff;
  }
  return AVATAR_HUES[Math.abs(hash) % AVATAR_HUES.length];
}

export const Avatar = ({
  owner = '',
  size,
  variant = 'md',
  shape = 'circle',
  alt,
  className,
}: AvatarProps) => {
  const px = size ?? NAMED_SIZES[variant];
  const initials = getAvatarInitials(owner);
  const hue = getAvatarHue(owner);

  const classes = [
    'nb-avatar',
    shape === 'square' && 'nb-avatar--square',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={classes}
      role="img"
      aria-label={alt ?? (owner || 'Avatar')}
      style={{
        width: px,
        height: px,
        fontSize: Math.round(px * 0.38),
        '--avatar-hue': hue,
      } as React.CSSProperties}
    >
      {initials}
    </span>
  );
};
