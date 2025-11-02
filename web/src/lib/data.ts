import { getMockDataPort, syncMockIdeas } from "@/lib/adapters/mockDataAdapter";
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
    const result = await listIdeasRemote();
    if (!result.ok) throw new Error(result.error);
    const ideas = result.data.map(mapIdea);
    syncMockIdeas(ideas);
    return ideas;
  },
  async createIdea(input) {
    const trimmedTitle = input.title.trim();
    if (!trimmedTitle) {
      throw new Error("Title is required");
    }

    const trimmedDescription = input.description?.trim() ?? "";
    const res = await createIdeaRemote(
      // Only pass description when it's a non-empty string.
      trimmedDescription
        ? { title: trimmedTitle, description: trimmedDescription }
        : { title: trimmedTitle }
    );

    if (!res.ok) throw new Error(res.error);

    return {
      id: crypto.randomUUID(),
      title: trimmedTitle,
      description: trimmedDescription ? trimmedDescription : null,
      createdAt: new Date().toISOString(),
    } satisfies Idea;
  },
  async deleteIdea(id) {
    const res = await deleteIdeaRemote(id);
    if (!res.ok) throw new Error(res.error);
  },
};
