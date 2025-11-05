"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuthSession } from "@/hooks/useAuthSession";
import type { Friend, Profile } from "@/lib/domain/types";
import { dataPort } from "@/lib/data";
import { MOCK_STORAGE_KEY } from "@/lib/adapters/mockDataAdapter";

const VOTE_PREFIX = "green-needle:votes:";

export default function SettingsPage() {
  const { session } = useAuthSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");
  const [nicknameNotice, setNicknameNotice] = useState<string | null>(null);
  const [savingNickname, setSavingNickname] = useState(false);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [pendingAddId, setPendingAddId] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  const [cleared, setCleared] = useState(false);

  const isAuthenticated = Boolean(session);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setProfile(null);
      setNicknameInput("");
      setFriends([]);
      setProfileError(null);
      setFriendError(null);
      setProfileLoading(false);
      setFriendsLoading(false);
      return () => {
        active = false;
      };
    }

    setProfileLoading(true);
    setFriendsLoading(true);
    setProfileError(null);
    setFriendError(null);
    void (async () => {
      try {
        const [profileData, friendData] = await Promise.all([
          dataPort.getProfile(),
          dataPort.listFriends(),
        ]);
        if (!active) return;
        setProfile(profileData);
        setNicknameInput(profileData.nickname ?? "");
        setFriends(friendData);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Failed to load settings.";
        setProfileError(message);
      } finally {
        if (!active) return;
        setProfileLoading(false);
        setFriendsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const handleNicknameSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!profile) {
        return;
      }
      const trimmed = nicknameInput.trim();
      if (!trimmed) {
        setProfileError("Nickname cannot be empty.");
        return;
      }
      setProfileError(null);
      setNicknameNotice(null);
      setSavingNickname(true);
      try {
        const updated = await dataPort.updateProfileNickname(trimmed);
        setProfile(updated);
        setNicknameInput(updated.nickname ?? "");
        setNicknameNotice("Nickname updated.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to update nickname.";
        setProfileError(message);
      } finally {
        setSavingNickname(false);
      }
    },
    [nicknameInput, profile],
  );

  const handleSearch = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!isAuthenticated) {
        setSearchMessage("Sign in to search for friends.");
        return;
      }
      const query = searchQuery.trim();
      if (query.length === 0) {
        setSearchMessage("Enter a nickname to search.");
        setSearchResults([]);
        return;
      }
      setSearching(true);
      setFriendError(null);
      setSearchMessage(null);
      try {
        const results = await dataPort.searchProfiles(query);
        const filtered = results.filter((item) => {
          if (profile && item.id === profile.id) {
            return false;
          }
          return !friends.some((friend) => friend.profileId === item.id);
        });
        setSearchResults(filtered);
        if (filtered.length === 0) {
          setSearchMessage("No profiles found for that nickname.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Search failed.";
        setFriendError(message);
      } finally {
        setSearching(false);
      }
    },
    [friends, isAuthenticated, profile, searchQuery],
  );

  const handleAddFriend = useCallback(
    async (profileId: string) => {
      setFriendError(null);
      setSearchMessage(null);
      setPendingAddId(profileId);
      try {
        const added = await dataPort.addFriend(profileId);
        setFriends((current) => {
          if (current.some((friend) => friend.profileId === added.profileId)) {
            return current;
          }
          return [...current, added].sort((a, b) => (a.nickname ?? "").localeCompare(b.nickname ?? ""));
        });
        setSearchResults((current) => current.filter((item) => item.id !== profileId));
        setSearchMessage("Friend added!");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to add friend.";
        setFriendError(message);
      } finally {
        setPendingAddId(null);
      }
    },
    [],
  );

  const handleRemoveFriend = useCallback(async (profileId: string) => {
    setFriendError(null);
    setPendingRemoveId(profileId);
    try {
      await dataPort.removeFriend(profileId);
      setFriends((current) => current.filter((friend) => friend.profileId !== profileId));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to remove friend.";
      setFriendError(message);
    } finally {
      setPendingRemoveId(null);
    }
  }, []);

  const handleClear = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!confirm("Clear local data for ideas, tournaments, and votes?")) return;
    try {
      window.localStorage.removeItem(MOCK_STORAGE_KEY);
      const keysToRemove: string[] = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key && key.startsWith(VOTE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => window.localStorage.removeItem(key));
      setCleared(true);
    } catch (error) {
      console.error("Failed to clear local data", error);
    }
  }, []);

  const friendCountLabel = useMemo(() => {
    const count = friends.length;
    if (count === 0) return "No friends yet.";
    if (count === 1) return "1 friend";
    return `${count} friends`;
  }, [friends.length]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-[var(--muted)]">Tweak your workspace, personalize your profile, and reset mock data for testing.</p>
      </div>

      {isAuthenticated ? (
        <section className="card space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Profile</h2>
            <p className="text-sm text-[var(--muted)]">Pick the nickname that appears in chat and to your friends.</p>
          </div>
          <form onSubmit={handleNicknameSubmit} className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-[240px_1fr] sm:items-center">
              <label className="text-sm font-medium text-[var(--muted)]" htmlFor="nickname">
                Nickname
              </label>
              <Input
                id="nickname"
                value={nicknameInput}
                onChange={(event) => {
                  setNicknameInput(event.target.value);
                  setNicknameNotice(null);
                }}
                disabled={savingNickname || profileLoading}
                placeholder="Enter a nickname"
                maxLength={32}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={savingNickname || profileLoading}>
                {savingNickname ? "Saving…" : "Save nickname"}
              </Button>
              {profile?.email ? (
                <span className="text-xs text-[var(--muted)]">Signed in as {profile.email}</span>
              ) : null}
            </div>
            {profileError ? <p className="text-sm text-rose-400">{profileError}</p> : null}
            {nicknameNotice ? <p className="text-sm text-emerald-400">{nicknameNotice}</p> : null}
          </form>
        </section>
      ) : (
        <section className="card space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Profile</h2>
            <p className="text-sm text-[var(--muted)]">Sign in to manage your nickname and friends.</p>
          </div>
        </section>
      )}

      {isAuthenticated ? (
        <section className="card space-y-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Friends</h2>
            <p className="text-sm text-[var(--muted)]">Search by nickname to add or remove friends.</p>
          </div>
          <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Your friends</h3>
              <span className="text-xs text-[var(--muted)]">{friendCountLabel}</span>
            </div>
            {friendsLoading ? (
              <div className="space-y-3">
                <div className="h-10 rounded-xl bg-[color-mix(in_srgb,var(--muted)_16%,transparent)]" />
                <div className="h-10 rounded-xl bg-[color-mix(in_srgb,var(--muted)_16%,transparent)]" />
              </div>
            ) : friends.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">You haven’t added any friends yet.</p>
            ) : (
              <ul className="space-y-3">
                {friends.map((friend) => (
                  <li key={friend.profileId} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">{friend.nickname ?? "Unknown player"}</p>
                      {friend.email ? <p className="text-xs text-[var(--muted)]">{friend.email}</p> : null}
                    </div>
                    <Button
                      type="button"
                      variant="subtle"
                      size="sm"
                      className="text-rose-500 hover:bg-rose-500/10"
                      disabled={pendingRemoveId === friend.profileId}
                      onClick={() => void handleRemoveFriend(friend.profileId)}
                    >
                      {pendingRemoveId === friend.profileId ? "Removing…" : "Remove"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {friendError ? <p className="text-sm text-rose-400">{friendError}</p> : null}
          </div>
          <form onSubmit={handleSearch} className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <Input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchMessage(null);
                }}
                placeholder="Search by nickname"
                disabled={searching}
                maxLength={40}
              />
              <Button type="submit" disabled={searching}>
                {searching ? "Searching…" : "Search"}
              </Button>
            </div>
            {searchMessage ? <p className="text-sm text-[var(--muted)]">{searchMessage}</p> : null}
            {searchResults.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Results</p>
                <ul className="space-y-3">
                  {searchResults.map((result) => (
                    <li key={result.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">{result.nickname ?? "Unknown player"}</p>
                        {result.email ? <p className="text-xs text-[var(--muted)]">{result.email}</p> : null}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={pendingAddId === result.id}
                        onClick={() => void handleAddFriend(result.id)}
                      >
                        {pendingAddId === result.id ? "Adding…" : "Add"}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </form>
        </section>
      ) : null}

      <section className="card space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Theme</h2>
            <p className="text-sm text-[var(--muted)]">Toggle between light and dark modes.</p>
          </div>
          <ThemeToggle />
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
          <h3 className="text-base font-semibold">Clear local data</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Removes mock ideas, tournaments, and voting history stored in your browser.
          </p>
          <Button type="button" variant="secondary" className="mt-4" onClick={handleClear}>
            Clear data
          </Button>
          {cleared ? <p className="mt-2 text-xs text-[var(--muted)]">Data cleared. Refresh to start fresh.</p> : null}
        </div>
      </section>
    </div>
  );
}
