export async function getAudioDurationSeconds(file: File): Promise<number | null> {
  const url = URL.createObjectURL(file);

  try {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.src = url;

    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        audio.removeEventListener("loadedmetadata", onLoaded);
        audio.removeEventListener("error", onError);
      };
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error("Failed to read audio metadata."));
      };

      audio.addEventListener("loadedmetadata", onLoaded);
      audio.addEventListener("error", onError);
    });

    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return null;
    return Math.round(audio.duration);
  } finally {
    URL.revokeObjectURL(url);
  }
}

