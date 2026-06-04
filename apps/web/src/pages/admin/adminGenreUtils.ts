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
