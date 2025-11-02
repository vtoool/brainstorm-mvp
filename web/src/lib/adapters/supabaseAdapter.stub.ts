// web/src/lib/adapters/supabaseAdapter.stub.ts
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

// Shapes kept tiny so they’re easy to map in data.ts
type IdeaRow = { id: string; title: string; description: string | null; created_at: string };

export async function listIdeas(ownerId?: string) {
  const supabase = getSupabaseBrowser();

  // If you want to hard-gate on auth, uncomment the next 3 lines:
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) return { ok: false as const, error: "not-signed-in", data: [] as IdeaRow[] };

  let q = supabase
    .from("ideas")
    .select("id,title,description,created_at")
    .order("created_at", { ascending: false });

  if (ownerId) q = q.eq("owner", ownerId); // optional; RLS will already scope rows

  const { data, error } = await q;
  return error
    ? { ok: false as const, error: error.message, data: [] as IdeaRow[] }
    : { ok: true as const, data: (data ?? []) as IdeaRow[] };
}

export async function createIdea({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const supabase = getSupabaseBrowser();

  // Ensure we have a user so the RLS WITH CHECK passes
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "not-signed-in" };

  // Your table has an RLS policy like: WITH CHECK (owner = auth.uid()).
  // Inserting owner: user.id satisfies that policy. If your column default is auth.uid(),
  // you could omit owner entirely—but keeping it explicit avoids ambiguity.
  const { error } = await supabase
    .from("ideas")
    .insert({ title, description: description || null, owner: user.id });

  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

export async function deleteIdea(id: string) {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.from("ideas").delete().eq("id", id);
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}
