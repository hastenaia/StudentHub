export type ChillAmbientId = "brown" | "rain" | "cafe" | "forest" | "white" | "lofi";

/** Single-track rule: clicking the active card stops it, any other card switches to it. */
export function nextActiveId(
  current: ChillAmbientId | null,
  clicked: ChillAmbientId
): ChillAmbientId | null {
  return clicked === current ? null : clicked;
}
