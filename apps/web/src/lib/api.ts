import { createPlaylistedApi } from "@playlisted/client-sdk";

import { trafficHeaders } from "./trafficIdentity";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export const api = createPlaylistedApi({ baseUrl, headers: trafficHeaders() });
