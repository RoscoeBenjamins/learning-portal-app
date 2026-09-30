import { supabase } from "@/lib/supabase-browser";
// Best-effort activity log (page views, quiz submits…). Never blocks the UI.
let last = "";
export function track(event: string, path?: string, meta?: Record<string, unknown>) {
  const key = `${event}|${path}`;
  if (event === "page_view" && key === last) return;
  last = key;
  supabase().from("activity_log").insert({ event, path, meta: meta ?? {} }).then(() => {}, () => {});
}
