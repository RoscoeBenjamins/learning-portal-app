"use client";
import { supabase } from "./supabase-browser";
import { q } from "./useData";
import type { Course, Topic } from "./types";
import { slugCode } from "./types";

export async function getCourses() {
  return q<Course[]>(supabase().from("courses").select("*").order("sort_order"));
}
export async function getCourseBySlug(slug: string) {
  const all = await getCourses();
  const c = all.find((x) => slugCode(x.code) === slug.toLowerCase());
  if (!c) throw new Error("Course not found");
  return c;
}
export async function getTopics(code: string) {
  return q<Topic[]>(supabase().from("topics").select("id,course_code,position,title,summary,updated_at,audio_script,key_terms,source_files,content_md").eq("course_code", code).order("position"));
}
