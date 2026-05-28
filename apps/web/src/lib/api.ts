import { createPlaylistedApi } from "@playlisted/client-sdk";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export const api = createPlaylistedApi({ baseUrl });
