import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export async function listIdeas(ownerId?: string) {
  const supabase = getSupabaseBrowser() as any;
  // Owner filter is optional if RLS enforces owner = auth.uid().
  const q = supabase
    .from("ideas")
    .select("id,title,description,created_at")
    .order("created_at", { ascending: false });
  const { data, error } = ownerId ? await q.eq("owner", ownerId) : await q;
  if (error) throw error;
  return data ?? [];
}

export async function createIdea(input: { title: string; description: string | null }) {
  const supabase = getSupabaseBrowser() as any;
  // Don’t await a full round-trip for rows; refresh() reconciles after persistence.
  const { error } = await supabase
    .from("ideas")
    .insert({ title: input.title, description: input.description ?? null });
  if (error) throw error;
  return { ok: true as const };
}

export async function deleteIdea(id: string) {
  const supabase = getSupabaseBrowser() as any;
  const { error } = await supabase.from("ideas").delete().eq("id", id);
  if (error) throw error;
  return { ok: true as const };
}
