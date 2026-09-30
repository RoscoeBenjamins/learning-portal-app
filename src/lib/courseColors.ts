// Each course keeps one colour everywhere: its tile, progress ring and section tabs.
// Apple system colours; used as fills and rings, never as the only carrier of meaning.
const COLORS: Record<string, string> = {
  cics501: "#007AFF", // blue
  ciis534: "#5856D6", // indigo
  ciis532: "#FF9500", // orange
  ciis6011: "#34C759", // green
  cics502: "#FF3B30", // red
  ciis691: "#AF52DE", // purple
};
export function courseColor(slugOrCode: string) {
  return COLORS[slugOrCode.toLowerCase().replace(/\s+/g, "")] ?? "#8E8E93";
}
