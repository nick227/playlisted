import createClient, { type Client, type ClientOptions } from "openapi-fetch";

import type { paths } from "./generated/schema";

export type { components, operations, paths } from "./generated/schema";

export interface PlaylistedClientOptions extends Omit<ClientOptions, "baseUrl"> {
  baseUrl?: string;
}

export type RawPlaylistedClient = Client<paths>;

export function createPlaylistedClient(options: PlaylistedClientOptions = {}): RawPlaylistedClient {
  return createClient<paths>({
    ...options,
    baseUrl: options.baseUrl ?? "http://localhost:4000",
  });
}
