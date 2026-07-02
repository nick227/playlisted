import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { X, Mic, Upload, MessageSquare, CheckCircle2, Loader2 } from "lucide-react";
import {
  createManualTranscript,
  fetchRecordingSubtitles,
  fetchTranscripts,
  updateTranscript,
  uploadTranscript,
  generateTranscript,
  updateRecordingSubtitlesDisabled,
} from "@/lib/subtitles";
import { useSuppressPlaybackFocus } from "@/lib/playbackFocusSuppression";
import { useAuth } from "@/providers/AuthProvider";
import type { TranscriptEntity } from "@/types/transcript";

interface SubtitleEditorModalProps {
  recordingId: string;
  recordingTitle: string;
  initialSubtitlesDisabled?: boolean;
  onClose: () => void;
}

type GenerateProvider = "whisper" | "modal";

export function SubtitleEditorModal({ recordingId, recordingTitle, initialSubtitlesDisabled = false, onClose }: SubtitleEditorModalProps) {
  useSuppressPlaybackFocus();
  const { accessToken } = useAuth();

  const [activeTab, setActiveTab] = useState<"lyrics" | "subtitles">("lyrics");
  const [transcripts, setTranscripts] = useState<TranscriptEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [subtitlesDisabled, setSubtitlesDisabled] = useState(initialSubtitlesDisabled);
  
  const [srtDraft, setSrtDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingGenerateProvider, setPendingGenerateProvider] = useState<GenerateProvider | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subtitleDisableTouchedRef = useRef(false);

  const effectiveTranscript = useMemo(
    () =>
      transcripts.find((t) => t.isActive && t.status === "READY") ??
      transcripts.find((t) => t.status === "READY") ??
      transcripts.find((t) => t.isActive && (t.status === "PROCESSING" || t.status === "QUEUED")) ??
      transcripts.find((t) => t.status === "PROCESSING" || t.status === "QUEUED") ??
      transcripts.find((t) => t.isActive) ??
      transcripts[0],
    [transcripts],
  );

  const hasPendingTranscript = useMemo(
    () => transcripts.some((t) => t.status === "QUEUED" || t.status === "PROCESSING"),
    [transcripts],
  );

  const requireAccessToken = useCallback(() => {
    if (accessToken) return accessToken;
    setErrorMessage("You must be signed in to manage subtitles.");
    return null;
  }, [accessToken]);

  const fetchAndSetTranscripts = useCallback(async () => {
    if (!accessToken) {
      setTranscripts([]);
      return;
    }

    const [data, subtitleStatus] = await Promise.all([
      fetchTranscripts(recordingId, accessToken),
      fetchRecordingSubtitles(recordingId, accessToken).catch(() => null),
    ]);
    if (subtitleStatus && !subtitleDisableTouchedRef.current) {
      setSubtitlesDisabled(subtitleStatus.status === "DISABLED");
    }
    setTranscripts(data);
    const active =
      data.find((t) => t.isActive && t.status === "READY") ??
      data.find((t) => t.status === "READY") ??
      data.find((t) => t.isActive && (t.status === "PROCESSING" || t.status === "QUEUED")) ??
      data.find((t) => t.status === "PROCESSING" || t.status === "QUEUED") ??
      data.find((t) => t.isActive) ??
      data[0];
      
    if (active && active.srtText) {
      setSrtDraft(active.srtText);
    }
    
    // Automatically switch to subtitles tab if the effective one is not ready
    if (active && active.status !== "READY") {
      setActiveTab("subtitles");
    }
  }, [accessToken, recordingId]);

  useEffect(() => {
    fetchAndSetTranscripts().finally(() => setLoading(false));
  }, [fetchAndSetTranscripts]);

  // Polling for generation updates
  useEffect(() => {
    if (!accessToken) return;
    if (!hasPendingTranscript) return;

    const interval = setInterval(() => {
      fetchTranscripts(recordingId, accessToken)
        .then((data) => {
          setTranscripts((prev) => {
            const newlyReady =
              data.find((t) => t.isActive && t.status === "READY") ??
              data.find((t) => t.status === "READY");
            const previouslyPending = prev.find((t) => t.id === newlyReady?.id && (t.status === "PROCESSING" || t.status === "QUEUED"));
            if (previouslyPending && newlyReady?.srtText) {
              setSrtDraft(newlyReady.srtText);
            }
            return data;
          });
        })
        .catch((err: unknown) => {
          setErrorMessage(err instanceof Error ? err.message : "Failed to refresh transcript status");
        });
    }, 2000);

    return () => clearInterval(interval);
  }, [hasPendingTranscript, recordingId, accessToken]);

  const handleSaveLyrics = async () => {
    if (subtitlesDisabled) return;
    if (!srtDraft.trim()) return;
    const token = requireAccessToken();
    if (!token) return;

    setIsSaving(true);
    try {
      const saved = effectiveTranscript
        ? await updateTranscript(recordingId, effectiveTranscript.id, { srtText: srtDraft, isActive: true }, token)
        : await createManualTranscript(recordingId, srtDraft, token);

      setTranscripts((prev) => [
        saved,
        ...prev
          .filter((t) => t.id !== saved.id)
          .map((t) => ({ ...t, isActive: false })),
      ]);
      setSrtDraft(saved.srtText || srtDraft);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (subtitlesDisabled) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const token = requireAccessToken();
    if (!token) return;

    setLoading(true);
    try {
      const newTranscript = await uploadTranscript(recordingId, file, token);
      setTranscripts((prev) => [
        newTranscript,
        ...prev.map((t) => ({ ...t, isActive: false })),
      ]);
      setSrtDraft(newTranscript.srtText || "");
      setActiveTab("lyrics");
    } finally {
      e.target.value = "";
      setLoading(false);
    }
  };

  const handleSetActive = async (id: string) => {
    if (subtitlesDisabled) return;
    const token = requireAccessToken();
    if (!token) return;

    setLoading(true);
    try {
      const saved = await updateTranscript(recordingId, id, { isActive: true }, token);
      const updated = transcripts.map((t) => (t.id === saved.id ? saved : { ...t, isActive: false }));
      setTranscripts(updated);
      if (saved.srtText) setSrtDraft(saved.srtText);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (provider: GenerateProvider) => {
    if (subtitlesDisabled) return;
    const token = requireAccessToken();
    if (!token) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const newTranscript = await generateTranscript(recordingId, provider, token);
      setTranscripts((prev) => [
        newTranscript,
        ...prev.map((t) => ({ ...t, isActive: false })),
      ]);
      setSrtDraft("");
      setActiveTab("subtitles");
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to generate transcript");
    } finally {
      setLoading(false);
    }
  };

  const handleSubtitlesDisabledChange = async (checked: boolean) => {
    const token = requireAccessToken();
    if (!token) return;

    const previous = subtitlesDisabled;
    subtitleDisableTouchedRef.current = true;
    setSubtitlesDisabled(checked);
    setErrorMessage(null);
    setPendingGenerateProvider(null);
    setIsSaving(true);
    try {
      await updateRecordingSubtitlesDisabled(recordingId, checked, token);
    } catch (err: unknown) {
      setSubtitlesDisabled(previous);
      setErrorMessage(err instanceof Error ? err.message : "Failed to update subtitle settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex h-full max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[var(--color-canvas)] shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 p-4">
          <h2 className="text-lg font-bold text-white">Subtitle Editor</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 gap-4 border-b border-white/10 px-4 pt-2">
          <button
            className={`border-b-2 px-4 pb-2 font-medium transition-colors disabled:cursor-not-allowed disabled:text-white/25 ${
              activeTab === "lyrics"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-white/50 hover:text-white"
            }`}
            onClick={() => setActiveTab("lyrics")}
            disabled={subtitlesDisabled}
          >
            Lyrics
          </button>
          <button
            className={`border-b-2 px-4 pb-2 font-medium transition-colors disabled:cursor-not-allowed disabled:text-white/25 ${
              activeTab === "subtitles"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-white/50 hover:text-white"
            }`}
            onClick={() => setActiveTab("subtitles")}
            disabled={subtitlesDisabled}
          >
            Subtitles
          </button>
          <label className="ml-auto flex items-center gap-2 pb-2 text-sm font-medium text-white/70">
            <input
              type="checkbox"
              className="h-4 w-4 accent-emerald-400"
              checked={subtitlesDisabled}
              onChange={(e) => handleSubtitlesDisabledChange(e.target.checked)}
              disabled={isSaving}
            />
            Disable subtitles
          </label>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col bg-white/[0.02]">
          {errorMessage && (
            <div className="mx-4 mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {errorMessage}
            </div>
          )}
          {subtitlesDisabled ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-white/50">
              Subtitles are disabled for this song.
            </div>
          ) : loading && transcripts.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="animate-spin text-white/30" size={32} />
            </div>
          ) : activeTab === "lyrics" ? (
            <div className="flex flex-1 flex-col p-4">
              <textarea
                className="flex-1 resize-none rounded-lg border border-white/10 bg-black/20 p-4 font-mono text-sm text-white/80 focus:border-emerald-400/50 focus:outline-none"
                placeholder="1
00:00:00,000 --> 00:00:05,000
Lyrics in SRT format..."
                value={srtDraft}
                onChange={(e) => setSrtDraft(e.target.value)}
                disabled={subtitlesDisabled}
              />
              <div className="mt-4 flex justify-end">
                <button
                  className="rounded bg-emerald-500 px-6 py-2 font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
                  onClick={handleSaveLyrics}
                  disabled={subtitlesDisabled || isSaving || !srtDraft.trim()}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-y-auto p-4">
              {/* Generation Actions */}
              {pendingGenerateProvider ? (
                <div className="mb-8 flex flex-col items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-6 text-center">
                  <h4 className="mb-2 text-base font-bold text-white">Confirm Generation</h4>
                  <p className="mb-6 text-sm text-white/70">
                    Are you sure you want to generate new subtitles using {pendingGenerateProvider === "whisper" ? "Whisper API" : "Auto Generate"}? This will queue a new job.
                  </p>
                  <div className="flex justify-center gap-4">
                    <button
                      className="rounded px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                      onClick={() => setPendingGenerateProvider(null)}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      className="rounded bg-emerald-500 px-6 py-2 text-sm font-bold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
                      onClick={() => {
                        handleGenerate(pendingGenerateProvider);
                        setPendingGenerateProvider(null);
                      }}
                      disabled={subtitlesDisabled || loading}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-8 grid grid-cols-3 gap-3">
                  <button
                    className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 p-4 text-white hover:bg-white/10 transition-colors"
                    onClick={() => setPendingGenerateProvider("whisper")}
                    disabled={subtitlesDisabled || loading}
                    title="Generate with Whisper"
                  >
                    <Mic size={24} className="mb-2" />
                    <span className="text-sm font-medium">Whisper API</span>
                    <span className="mt-1 text-[10px] text-white/40 uppercase tracking-wider">Fast & Accurate</span>
                  </button>
                  <button
                    className="flex flex-col items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-300 hover:bg-emerald-400/20 transition-colors"
                    onClick={() => setPendingGenerateProvider("modal")}
                    disabled={subtitlesDisabled || loading}
                  >
                    <MessageSquare size={24} className="mb-2" />
                    <span className="text-sm font-medium">Auto Generate</span>
                    <span className="mt-1 text-[10px] text-emerald-300/50 uppercase tracking-wider">Playlisted Modal</span>
                  </button>
                  <button
                    className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 p-4 text-white hover:bg-white/10 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={subtitlesDisabled || loading}
                  >
                    <Upload size={24} className="mb-2 text-white/70" />
                    <span className="text-sm font-medium">Upload File</span>
                    <span className="mt-1 text-[10px] text-white/40 uppercase tracking-wider">SRT or VTT</span>
                  </button>
                  <input
                    type="file"
                    accept=".srt,.vtt"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                </div>
              )}

              {/* History List */}
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/40">
                  Transcript History
                </h3>
                <div className="flex flex-col gap-2">
                  {transcripts.length === 0 ? (
                    <p className="text-sm text-white/30">No transcripts found.</p>
                  ) : (
                    transcripts.map((t) => (
                      <div
                        key={t.id}
                        className={`flex items-center justify-between rounded-lg border p-3 ${
                          t.isActive
                            ? "border-emerald-400/30 bg-emerald-400/10"
                            : "border-white/5 bg-white/5"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">
                              {recordingTitle} ({t.source})
                            </span>
                            {t.isActive && t.status === "READY" && (
                              <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                <CheckCircle2 size={12} />
                                ACTIVE
                              </span>
                            )}
                            {t.status === "QUEUED" && (
                              <span className="flex items-center gap-1 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-300">
                                <Loader2 size={12} className="animate-spin" />
                                QUEUED (WAITING)
                              </span>
                            )}
                            {t.status === "PROCESSING" && (
                              <span className="flex items-center gap-1 rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
                                <Loader2 size={12} className="animate-spin" />
                                GENERATING
                              </span>
                            )}
                            {t.status === "FAILED" && (
                              <div className="flex flex-col gap-1 mt-1">
                                <span className="flex items-center gap-1 w-max rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                                  FAILED
                                </span>
                                {t.errorMessage && (
                                  <span className="text-xs text-red-400/80 italic bg-red-500/10 p-2 rounded max-w-full break-words">
                                    {t.errorMessage}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-white/40">
                            {new Date(t.createdAt).toLocaleString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!t.isActive && t.status === "READY" && (
                            <button
                              className="rounded px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                              onClick={() => handleSetActive(t.id)}
                              disabled={subtitlesDisabled || loading}
                            >
                              Set Active
                            </button>
                          )}
                          {t.status === "READY" && t.srtText && (
                            <a
                              href={`data:text/plain;charset=utf-8,${encodeURIComponent(t.srtText)}`}
                              download={`${recordingTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${t.language || "en"}.srt`}
                              className="rounded px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                              title="Download SRT"
                            >
                              Download SRT
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
