"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import type { ChatMessage, Profile } from "@/lib/domain/types";
import { dataPort } from "@/lib/data";

type TournamentChatProps = {
  tournamentId: string;
};

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

export function TournamentChat({ tournamentId }: TournamentChatProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [profileData, existingMessages] = await Promise.all([
          dataPort
            .getProfile()
            .then((data) => data)
            .catch(() => null),
          dataPort.listChatMessages(tournamentId),
        ]);
        if (!active) return;
        setProfile(profileData);
        setMessages(existingMessages);
      } catch (unknownError) {
        if (!active) return;
        const message =
          unknownError instanceof Error ? unknownError.message : "Failed to load chat messages.";
        setError(message);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    })();

    const unsubscribe = dataPort.subscribeToChatMessages(tournamentId, (message) => {
      setMessages((current) => {
        if (current.some((existing) => existing.id === message.id)) {
          return current;
        }
        const next = [...current, message];
        next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return next;
      });
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [tournamentId]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  const canChat = useMemo(() => {
    if (!profile) return false;
    return Boolean(profile.nickname && profile.nickname.trim().length >= 2);
  }, [profile]);

  const handleSend = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = input.trim();
      if (!trimmed || sending || !canChat) {
        return;
      }
      setSending(true);
      setError(null);
      try {
        const message = await dataPort.sendChatMessage(tournamentId, trimmed);
        setMessages((current) => {
          if (current.some((existing) => existing.id === message.id)) {
            return current;
          }
          const next = [...current, message];
          next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          return next;
        });
        setInput("");
      } catch (unknownError) {
        const message = unknownError instanceof Error ? unknownError.message : "Failed to send message.";
        setError(message);
      } finally {
        setSending(false);
      }
    },
    [canChat, input, sending, tournamentId],
  );

  return (
    <section className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">Live chat</h2>
          <p className="text-xs text-[var(--muted)]">Share reactions in real time with everyone in the bracket.</p>
        </div>
        <span className="text-xs text-[var(--muted)]">{messages.length} messages</span>
      </div>
      <div
        ref={scrollRef}
        className="max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-[color-mix(in_srgb,var(--border)_60%,transparent)] bg-[color-mix(in_srgb,var(--card)_90%,transparent)] p-4"
      >
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 rounded-xl bg-[color-mix(in_srgb,var(--muted)_12%,transparent)]" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No messages yet. Start the conversation!</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((message) => {
              const isSelf = profile?.id === message.authorId;
              return (
                <li
                  key={message.id}
                  className={`rounded-2xl border p-3 ${
                    isSelf
                      ? "border-[color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                      : "border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color-mix(in_srgb,var(--card)_94%,transparent)]"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                    <span className="font-semibold text-[var(--text)]">
                      {message.authorNickname ?? "Anonymous"}
                    </span>
                    <span>{timeFormatter.format(new Date(message.createdAt))}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text)]">{message.content}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <form onSubmit={handleSend} className="space-y-3">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={!canChat || sending}
          placeholder={canChat ? "Type a message" : "Set your nickname in settings to join the chat."}
          rows={3}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--muted)]">
            {profile
              ? canChat
                ? `Chatting as ${profile.nickname}`
                : "Set a nickname in settings before chatting."
              : "Sign in to send messages."}
          </p>
          <Button type="submit" size="sm" disabled={!canChat || sending || input.trim().length === 0}>
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </form>
    </section>
  );
}
