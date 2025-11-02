import { getMockDataPort } from "@/lib/adapters/mockDataAdapter";
import { createIdea as createIdeaRemote, deleteIdea as deleteIdeaRemote, listIdeas as listIdeasRemote } from "@/lib/adapters/supabaseAdapter.stub";
import type { Idea } from "@/lib/domain/types";
import type { DataPort } from "@/lib/ports/DataPort";

function mapIdea(record: { id: string; title: string; description: string | null; created_at: string }) {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    createdAt: record.created_at,
  } satisfies Idea;
}

const mockPort = getMockDataPort();

export const dataPort: DataPort = {
  ...mockPort,
  async listIdeas() {
    const res = await listIdeasRemote();
    if (!res.ok) {
      throw new Error(res.error);
    }
    return res.data.map(mapIdea);
  },
  async createIdea(input) {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      throw new Error("Title is required");
    }

    const trimmedDescription = input.description?.trim() ?? "";

    const createRes = await createIdeaRemote({
      title: trimmedTitle,
      description: trimmedDescription ? trimmedDescription : null,
    });

    if (!createRes.ok) {
      throw new Error(createRes.error);
    }

    return {
      // optimistic ID fallback for environments without crypto.randomUUID
      id:
        (globalThis as any).crypto?.randomUUID?.() ??
        `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      title: trimmedTitle,
      description: trimmedDescription ? trimmedDescription : null,
      createdAt: new Date().toISOString(),
    } satisfies Idea;
  },
  async deleteIdea(id) {
    const delRes = await deleteIdeaRemote(id);
    if (!delRes.ok) {
      throw new Error(delRes.error);
    }
  },
};
