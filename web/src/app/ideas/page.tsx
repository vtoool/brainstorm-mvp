"use client";

import { useCallback, useEffect, useState } from "react";
import { redirect } from "next/navigation";

import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { useAuthSession } from "@/hooks/useAuthSession";

type Idea = {
  id: string;
  owner: string | null;
  title: string;
  description: string | null;
  created_at: string;
};

export default function IdeasPage() {
  const supabase = getSupabaseBrowser();
  const { session, loading } = useAuthSession();

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const userId = session?.user?.id ?? null;

  const fetchMine = useCallback(
    async (uid: string) => {
      const query = supabase.from("ideas").select("*").order("created_at", { ascending: false });
      const { data } = await query.eq("owner", uid);
      setIdeas((data ?? []) as Idea[]);
    },
    [supabase]
  );

  useEffect(() => {
    if (!userId) {
      setIdeas([]);
      return;
    }

    fetchMine(userId);
  }, [userId, fetchMine]);

  async function addIdea() {
    if (!userId) return alert("Sign in first");
    if (!title.trim()) return;

    const newIdea = { title: title.trim(), description: description.trim(), owner: userId };

    setTitle("");
    setDescription("");

    const tempId = crypto.randomUUID();

    setIdeas((cur) => [
      { id: tempId, owner: userId, title: newIdea.title, description: newIdea.description, created_at: new Date().toISOString() },
      ...cur,
    ]);

    const { data, error } = await supabase.from("ideas").insert(newIdea).select("*").single();

    if (error) {
      setIdeas((cur) => cur.filter((idea) => idea.id !== tempId));
    } else {
      setIdeas((cur) => [data as Idea, ...cur.filter((idea) => idea.id !== tempId)]);
    }
  }

  async function removeIdea(id: string) {
    if (!confirm("Delete this idea?")) return;

    const previous = ideas;
    setIdeas((cur) => cur.filter((idea) => idea.id !== id));

    const { error } = await supabase.from("ideas").delete().eq("id", id);

    if (error) {
      setIdeas(previous);
    }
  }

  if (loading) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">Your Ideas</h1>
        <p>Loading…</p>
      </main>
    );
  }

  if (!session) {
    redirect("/signin");
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">Your Ideas</h1>
      <div className="border rounded p-4 space-y-3">
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Idea title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full border rounded px-3 py-2"
          placeholder="Short description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button onClick={addIdea} className="rounded bg-black text-white px-4 py-2">
          Add Idea
        </button>
      </div>
      <ul className="space-y-3">
        {ideas.map((idea) => (
          <li key={idea.id} className="border rounded p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium">{idea.title}</h3>
                {idea.description && <p className="text-sm text-gray-600 mt-1">{idea.description}</p>}
              </div>
              <button onClick={() => removeIdea(idea.id)} className="text-sm px-3 py-1 rounded bg-red-100 hover:bg-red-200">
                Delete
              </button>
            </div>
          </li>
        ))}
        {ideas.length === 0 && <p className="text-gray-600">No ideas yet.</p>}
      </ul>
    </main>
  );
}
