/** Recordings visible in public library and search surfaces. */
export const PUBLIC_PUBLISHED_RECORDING = {
  visibility: "PUBLIC" as const,
  status: "PUBLISHED" as const,
};

/** Prisma filter for counting only public published recording tags on a genre. */
export const PUBLIC_RECORDING_TAG_COUNT_SELECT = {
  recordingTags: {
    where: {
      recording: PUBLIC_PUBLISHED_RECORDING,
    },
  },
} as const;
