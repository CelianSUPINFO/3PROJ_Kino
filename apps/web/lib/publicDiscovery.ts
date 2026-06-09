import { apiFetch } from "./api";

export type DiscoveredUser = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
};

export type DiscoveredList = {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  isPublic?: boolean;
  user: { id?: string; displayName: string };
  _count?: { items: number };
};

type SearchResult = {
  users: DiscoveredUser[];
  lists: DiscoveredList[];
};

const discoveryTerms = [
  "",
  ..."abcdefghijklmnopqrstuvwxyz",
  "liste",
  "amis",
  "montrer",
  "secrete",
  "indispensables",
  "dimanche",
];

let discoveryPromise: Promise<{
  users: DiscoveredUser[];
  lists: DiscoveredList[];
}> | null = null;

async function discover() {
  discoveryPromise ??= Promise.all(
      discoveryTerms.map((term) =>
        apiFetch<SearchResult>(`/search?q=${encodeURIComponent(term)}`, {
          auth: false,
        }).catch(() => ({ users: [], lists: [] })),
      ),
    ).then((results) => ({
      users: [...new Map(results.flatMap((result) => result.users).map((user) => [user.id, user])).values()],
      lists: [...new Map(results.flatMap((result) => result.lists).map((list) => [list.id, list])).values()],
    }));
  return discoveryPromise;
}

export async function discoverAllUsers() {
  return (await discover()).users.sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
}

export async function discoverPublicListsForUser(userId: string) {
  return (await discover()).lists
    .filter((list) => (list.userId ?? list.user.id) === userId)
    .map((list) => ({ ...list, isPublic: true }));
}
