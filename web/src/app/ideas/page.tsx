"use client";

import { FormEvent, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { IdeaFolderCard } from "@/components/IdeaCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useAuthSession } from "@/hooks/useAuthSession";

import { useIdeaFolders } from "./useIdeaFolders";

interface IdeaDraftState {
  title: string;
  description: string;
}

export default function IdeasPage() {
  const {
    folders,
    isLoading,
    isCreatingFolder,
    isRefreshing,
    creatingIdeaFor,
    deletingFolderId,
    deletingIdeaId,
    error,
    folderError,
    ideaError,
    justSaved,
    createFolder,
    addIdeaToFolder,
    removeIdea,
    removeFolder,
    clearFolderError,
    clearIdeaError,
  } = useIdeaFolders();
  const { session } = useAuthSession();

  const [folderTitle, setFolderTitle] = useState("");
  const [folderDescription, setFolderDescription] = useState("");
  const [folderTheme, setFolderTheme] = useState("");
  const [folderColor, setFolderColor] = useState("#34d399");
  const [folderIcon, setFolderIcon] = useState("🗂️");
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [ideaDrafts, setIdeaDrafts] = useState<Record<string, IdeaDraftState>>({});

  const statusMessage = useMemo(() => {
    if (isCreatingFolder || isRefreshing || creatingIdeaFor) return "Saving…";
    if (justSaved) return "Saved";
    return null;
  }, [creatingIdeaFor, isCreatingFolder, isRefreshing, justSaved]);

  function resetFolderForm() {
    setFolderTitle("");
    setFolderDescription("");
    setFolderTheme("");
    setFolderColor("#34d399");
    setFolderIcon("🗂️");
    clearFolderError();
  }

  async function handleCreateFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const created = await createFolder({
      title: folderTitle,
      description: folderDescription,
      theme: folderTheme,
      color: folderColor,
      icon: folderIcon,
    });
    if (created) {
      resetFolderForm();
    }
  }

  function toggleFolder(folderId: string) {
    setOpenFolderId((current) => (current === folderId ? null : folderId));
    clearIdeaError();
  }

  function updateIdeaDraft(folderId: string, partial: Partial<IdeaDraftState>) {
    setIdeaDrafts((current) => {
      const existing = current[folderId] ?? { title: "", description: "" };
      return { ...current, [folderId]: { ...existing, ...partial } };
    });
  }

  async function handleAddIdea(event: FormEvent<HTMLFormElement>, folderId: string) {
    event.preventDefault();
    if (!session) return;
    const draft = ideaDrafts[folderId] ?? { title: "", description: "" };
    const wasAdded = await addIdeaToFolder(folderId, draft.title, draft.description);
    if (wasAdded) {
      updateIdeaDraft(folderId, { title: "", description: "" });
    }
  }

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="space-y-4 rounded-3xl border border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color-mix(in_srgb,var(--panel)_85%,transparent)] p-6">
          <div className="h-5 w-48 rounded-full bg-[color-mix(in_srgb,var(--muted)_25%,transparent)]" />
          <div className="h-12 rounded-2xl bg-[color-mix(in_srgb,var(--muted)_18%,transparent)]" />
          <div className="h-24 rounded-2xl bg-[color-mix(in_srgb,var(--muted)_18%,transparent)]" />
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-transparent bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.32),transparent_60%)] p-[1px] shadow-[0_40px_120px_rgba(56,189,248,0.18)]">
        <div className="relative grid gap-10 rounded-[calc(1.5rem-4px)] bg-[color-mix(in_srgb,var(--panel)_92%,white_8%)] px-6 py-8 sm:px-10 sm:py-12 md:grid-cols-[1fr_1.1fr]">
          <span className="pointer-events-none absolute -left-12 top-12 h-36 w-36 rounded-full bg-emerald-300/25 blur-3xl" aria-hidden="true" />
          <span className="pointer-events-none absolute -top-16 right-6 h-32 w-32 rounded-full bg-sky-300/30 blur-3xl" aria-hidden="true" />
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-emerald-700">
              Idea folders
            </span>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold text-[color-mix(in_srgb,var(--text)_92%,black_8%)]">
                File sparks into playful little folders.
              </h1>
              <p className="max-w-md text-sm leading-relaxed text-[color-mix(in_srgb,var(--muted)_70%,white_12%)]">
                Keep every lightning bolt of inspiration colour-coded and within reach. Draft, remix, and revisit ideas without losing the joyful chaos.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-300/40 bg-emerald-300/10 px-4 py-3 text-sm text-[color-mix(in_srgb,var(--text)_88%,white_12%)]">
                <span className="font-semibold text-emerald-600">🗂️ Stack &amp; sort.</span> Folders keep similar sparks cuddled together.
              </div>
              <div className="rounded-2xl border border-sky-300/40 bg-sky-300/10 px-4 py-3 text-sm text-[color-mix(in_srgb,var(--text)_88%,white_12%)]">
                <span className="font-semibold text-sky-600">✨ Brighten momentum.</span> Celebrate progress with every colorful card.
              </div>
            </div>
          </div>
          <form
            onSubmit={handleCreateFolder}
            className="relative space-y-5 rounded-2xl border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--panel)_82%,white_12%)] p-6 shadow-[0_30px_80px_rgba(16,185,129,0.2)] backdrop-blur-sm"
          >
            <div className="space-y-2">
              <label htmlFor="folder-title" className="text-xs font-semibold uppercase tracking-[0.28em] text-[color-mix(in_srgb,var(--muted)_65%,white_18%)]">
                Folder title
              </label>
              <Input
                id="folder-title"
                placeholder="Short title"
                value={folderTitle}
                onChange={(event) => {
                  setFolderTitle(event.target.value);
                  if (folderError) clearFolderError();
                }}
                maxLength={120}
                required
                className="border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--panel)_88%,white_12%)] shadow-[0_20px_45px_rgba(16,185,129,0.18)] focus:border-[color-mix(in_srgb,var(--accent)_60%,transparent)]"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="folder-theme" className="text-xs font-semibold uppercase tracking-[0.28em] text-[color-mix(in_srgb,var(--muted)_65%,white_18%)]">
                Theme <span className="font-normal normal-case text-[color-mix(in_srgb,var(--muted)_60%,white_20%)]">(optional)</span>
              </label>
              <Input
                id="folder-theme"
                placeholder="e.g. Launch ideas"
                value={folderTheme}
                onChange={(event) => setFolderTheme(event.target.value)}
                maxLength={60}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="folder-icon" className="text-xs font-semibold uppercase tracking-[0.28em] text-[color-mix(in_srgb,var(--muted)_65%,white_18%)]">
                  Icon
                </label>
                <Input
                  id="folder-icon"
                  value={folderIcon}
                  onChange={(event) => setFolderIcon(event.target.value.slice(0, 2))}
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="folder-color" className="text-xs font-semibold uppercase tracking-[0.28em] text-[color-mix(in_srgb,var(--muted)_65%,white_18%)]">
                  Color tag
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    id="folder-color"
                    type="color"
                    value={folderColor}
                    onChange={(event) => setFolderColor(event.target.value)}
                    className="h-10 w-20 cursor-pointer rounded-xl border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--panel)_90%,white_10%)] p-1"
                  />
                  <Input
                    value={folderColor}
                    onChange={(event) => setFolderColor(event.target.value)}
                    maxLength={32}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="folder-description" className="text-xs font-semibold uppercase tracking-[0.28em] text-[color-mix(in_srgb,var(--muted)_65%,white_18%)]">
                Description <span className="font-normal normal-case text-[color-mix(in_srgb,var(--muted)_60%,white_20%)]">(optional)</span>
              </label>
              <Textarea
                id="folder-description"
                placeholder="Add a few details or context"
                value={folderDescription}
                onChange={(event) => {
                  setFolderDescription(event.target.value);
                  if (folderError) clearFolderError();
                }}
                maxLength={500}
                className="min-h-[120px] border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--panel)_88%,white_12%)] shadow-[0_20px_45px_rgba(14,165,233,0.18)] focus:border-[color-mix(in_srgb,var(--accent)_60%,transparent)]"
              />
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3 text-xs text-[color-mix(in_srgb,var(--muted)_75%,white_15%)]">
                <span className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] px-3 py-1 font-medium text-[color-mix(in_srgb,var(--accent)_80%,var(--text)_20%)]">
                  <span aria-hidden="true">🔒</span> Private to you
                </span>
                <AnimatePresence>
                  {statusMessage ? (
                    <motion.span
                      key={statusMessage}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium ${
                        statusMessage === "Saved"
                          ? "bg-emerald-400/20 text-emerald-600"
                          : "bg-amber-400/25 text-amber-600"
                      }`}
                    >
                      <span aria-hidden="true">{statusMessage === "Saved" ? "✨" : "💾"}</span>
                      {statusMessage}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  disabled={!folderTitle.trim() || isCreatingFolder || !session}
                  title={!session ? "Sign in to add folders" : undefined}
                  className="shadow-[0_22px_45px_rgba(16,185,129,0.32)] hover:shadow-[0_28px_60px_rgba(14,165,233,0.28)]"
                >
                  {isCreatingFolder ? "Saving…" : "Add folder"}
                </Button>
              </div>
            </div>
            <AnimatePresence mode="wait">
              {folderError ? (
                <motion.p
                  key={folderError}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-sm text-rose-400"
                >
                  {folderError}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </form>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-[color-mix(in_srgb,var(--text)_92%,black_8%)]">Idea folders</h2>
            <p className="text-sm text-[color-mix(in_srgb,var(--muted)_70%,white_12%)]">
              {folders.length === 0 ? "No folders yet—start a fresh collection." : `${folders.length} folders on your shelf.`}
            </p>
          </div>
          {error ? (
            <p className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-500">
              <span aria-hidden="true">⚠️</span>
              {error}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {folders.map((folder) => {
              const draft = ideaDrafts[folder.id] ?? { title: "", description: "" };
              const isOpen = openFolderId === folder.id;
              return (
                <motion.div key={folder.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <IdeaFolderCard folder={folder} isOpen={isOpen} onToggle={() => toggleFolder(folder.id)}>
                    <div className="space-y-4">
                      <form className="space-y-3 rounded-2xl border border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color-mix(in_srgb,var(--panel)_90%,white_10%)] p-4" onSubmit={(event) => handleAddIdea(event, folder.id)}>
                        <div className="space-y-2">
                          <label htmlFor={`idea-title-${folder.id}`} className="text-xs font-semibold uppercase tracking-[0.24em] text-[color-mix(in_srgb,var(--muted)_65%,white_18%)]">
                            Idea title
                          </label>
                          <Input
                            id={`idea-title-${folder.id}`}
                            value={draft.title}
                            onChange={(event) => {
                              updateIdeaDraft(folder.id, { title: event.target.value });
                              if (ideaError) clearIdeaError();
                            }}
                            maxLength={140}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor={`idea-description-${folder.id}`} className="text-xs font-semibold uppercase tracking-[0.24em] text-[color-mix(in_srgb,var(--muted)_65%,white_18%)]">
                            Details <span className="font-normal normal-case text-[color-mix(in_srgb,var(--muted)_60%,white_20%)]">(optional)</span>
                          </label>
                          <Textarea
                            id={`idea-description-${folder.id}`}
                            value={draft.description}
                            onChange={(event) => updateIdeaDraft(folder.id, { description: event.target.value })}
                            maxLength={500}
                            className="min-h-[100px]"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Button type="submit" size="sm" disabled={!draft.title.trim() || creatingIdeaFor === folder.id || !session} title={!session ? "Sign in to add ideas" : undefined}>
                            {creatingIdeaFor === folder.id ? "Adding…" : "Add idea"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-rose-400 hover:text-rose-500"
                            disabled={deletingFolderId === folder.id || !session}
                            onClick={() => {
                              if (!session) return;
                              if (!confirm("Delete this folder and all ideas inside?")) return;
                              void removeFolder(folder.id);
                            }}
                          >
                            {deletingFolderId === folder.id ? "Removing…" : "Delete folder"}
                          </Button>
                        </div>
                      </form>
                      {folder.ideas.length > 0 ? (
                        <ul className="space-y-3">
                          {folder.ideas.map((idea) => (
                            <li
                              key={idea.id}
                              className="rounded-2xl border border-[color-mix(in_srgb,var(--border)_65%,transparent)] bg-[color-mix(in_srgb,var(--panel)_92%,white_8%)] p-4"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                  <h4 className="font-semibold text-[color-mix(in_srgb,var(--text)_92%,black_8%)]">{idea.title}</h4>
                                  {idea.description ? (
                                    <p className="text-sm text-[color-mix(in_srgb,var(--muted)_70%,white_12%)]">{idea.description}</p>
                                  ) : null}
                                  <p className="text-xs uppercase tracking-[0.24em] text-[color-mix(in_srgb,var(--muted)_70%,white_12%)]">
                                    {new Date(idea.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => {
                                    if (!session) return;
                                    if (!confirm("Delete this idea?")) return;
                                    void removeIdea(idea.id);
                                  }}
                                  disabled={deletingIdeaId === idea.id || !session}
                                  className="rounded-lg border border-transparent px-3 py-1 text-xs font-semibold text-rose-400 transition hover:border-rose-400/40 hover:bg-rose-400/10 hover:text-rose-500"
                                >
                                  {deletingIdeaId === idea.id ? "Removing…" : "Delete"}
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-[color-mix(in_srgb,var(--muted)_70%,white_12%)]">No ideas yet—add your first spark to this folder.</p>
                      )}
                    </div>
                  </IdeaFolderCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <AnimatePresence>
            {folders.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="col-span-full flex flex-col items-center justify-center rounded-3xl border border-dashed border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--panel)_85%,white_10%)] px-6 py-16 text-center"
              >
                <span className="mb-4 text-5xl" aria-hidden="true">
                  🗃️
                </span>
                <p className="text-sm text-[color-mix(in_srgb,var(--muted)_70%,white_12%)]">No folders yet—add your first idea to light the shelf.</p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <AnimatePresence mode="wait">
          {ideaError ? (
            <motion.p
              key={ideaError}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-sm text-rose-400"
            >
              {ideaError}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </section>
    </div>
  );
}
