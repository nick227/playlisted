import type { AdminContentTagRef } from "@playlisted/client-sdk";

export function genreIdsFromTags(tags: AdminContentTagRef[]): string[] {
  return tags.filter((t) => t.kind === "GENRE").map((t) => t.id);
}

export function mergeGenreIdsFromTags(tags: AdminContentTagRef[], addIds: string[]): string[] {
  return [...new Set([...genreIdsFromTags(tags), ...addIds])];
}

export async function runSequential<T>(
  ids: string[],
  fn: (id: string) => Promise<T | null>,
): Promise<T[]> {
  const results: T[] = [];
  for (const id of ids) {
    const result = await fn(id);
    if (result !== null) results.push(result);
  }
  return results;
}
