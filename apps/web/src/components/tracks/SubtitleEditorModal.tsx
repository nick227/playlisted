import { useState, useEffect, useRef } from "react";
import { X, Mic, Upload, MessageSquare, CheckCircle2, Loader2 } from "lucide-react";
import { fetchTranscripts, updateTranscript, uploadTranscript } from "@/lib/subtitles";
import { useSuppressPlaybackFocus } from "@/lib/playbackFocusSuppression";
import type { TranscriptEntity } from "@/types/transcript";

interface SubtitleEditorModalProps {
  recordingId: string;
  onClose: () => void;
}

export function SubtitleEditorModal({ recordingId, onClose }: SubtitleEditorModalProps) {
  useSuppressPlaybackFocus();

  const [activeTab, setActiveTab] = useState<"lyrics" | "subtitles">("lyrics");
  const [transcripts, setTranscripts] = useState<TranscriptEntity[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [srtDraft, setSrtDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTranscripts(recordingId).then((data) => {
      setTranscripts(data);
      const active = data.find((t) => t.isActive) || data[0];
      if (active && active.srtText) {
        setSrtDraft(active.srtText);
      }
      setLoading(false);
    });
  }, [recordingId]);

  const activeTranscript = transcripts.find((t) => t.isActive);

  const handleSaveLyrics = async () => {
    if (!activeTranscript) return;
    setIsSaving(true);
    try {
      await updateTranscript(activeTranscript.id, { srtText: srtDraft });
      // Update local state
      setTranscripts((prev) =>
        prev.map((t) => (t.id === activeTranscript.id ? { ...t, srtText: srtDraft } : t))
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const newTranscript = await uploadTranscript(recordingId, file);
      setTranscripts((prev) => [
        newTranscript,
        ...prev.map((t) => ({ ...t, isActive: false })),
      ]);
      setSrtDraft(newTranscript.srtText || "");
      setActiveTab("lyrics");
    } finally {
      setLoading(false);
    }
  };

  const handleSetActive = async (id: string) => {
    setLoading(true);
    try {
      await updateTranscript(id, { isActive: true });
      const updated = transcripts.map((t) => ({ ...t, isActive: t.id === id }));
      setTranscripts(updated);
      const newActive = updated.find((t) => t.id === id);
      if (newActive?.srtText) setSrtDraft(newActive.srtText);
    } finally {
      setLoading(false);
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
            className={`border-b-2 px-4 pb-2 font-medium transition-colors ${
              activeTab === "lyrics"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-white/50 hover:text-white"
            }`}
            onClick={() => setActiveTab("lyrics")}
          >
            Lyrics
          </button>
          <button
            className={`border-b-2 px-4 pb-2 font-medium transition-colors ${
              activeTab === "subtitles"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-white/50 hover:text-white"
            }`}
            onClick={() => setActiveTab("subtitles")}
          >
            Subtitles
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col bg-white/[0.02]">
          {loading && transcripts.length === 0 ? (
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
              />
              <div className="mt-4 flex justify-end">
                <button
                  className="rounded bg-emerald-500 px-6 py-2 font-semibold text-black hover:bg-emerald-400 disabled:opacity-50"
                  onClick={handleSaveLyrics}
                  disabled={isSaving || !activeTranscript}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-y-auto p-4">
              {/* Generation Actions */}
              <div className="mb-8 grid grid-cols-3 gap-3">
                <button
                  className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 p-4 text-white/30 transition-colors"
                  disabled
                  title="Coming soon"
                >
                  <Mic size={24} className="mb-2" />
                  <span className="text-sm font-medium">Whisper API</span>
                  <span className="mt-1 text-[10px] text-white/20 uppercase tracking-wider">Coming Soon</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-4 text-emerald-300 hover:bg-emerald-400/20 transition-colors"
                  onClick={() => {
                    alert("Trigger modal subtitle generation");
                  }}
                >
                  <MessageSquare size={24} className="mb-2" />
                  <span className="text-sm font-medium">Auto Generate</span>
                  <span className="mt-1 text-[10px] text-emerald-300/50 uppercase tracking-wider">Playlisted Modal</span>
                </button>
                <button
                  className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 p-4 text-white hover:bg-white/10 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
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
                              {t.source === "upload" ? "Uploaded File" : t.source === "modal" ? "Auto-Generated" : "Manual Edit"}
                            </span>
                            {t.isActive && (
                              <span className="flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                <CheckCircle2 size={12} />
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-white/40">
                            Created {new Date(t.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        {!t.isActive && (
                          <button
                            className="rounded px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
                            onClick={() => handleSetActive(t.id)}
                            disabled={loading}
                          >
                            Set Active
                          </button>
                        )}
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
