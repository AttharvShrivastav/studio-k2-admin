import type { CSSProperties } from "react";

type StudioK2LogoProps = {
  className?: string;
  color?: string;
  style?: CSSProperties;
  "aria-label"?: string;
};

export function StudioK2Logo({
  className = "",
  color,
  style,
  "aria-label": ariaLabel = "Studio K2",
}: StudioK2LogoProps) {
  return (
    <span
      className={`studio-k2-logo ${className}`.trim()}
      role="img"
      aria-label={ariaLabel}
      style={{ ...(color ? { color } : {}), ...style }}
    />
  );
}
