export type RecordingSubtitleStyleMemory = {
  recordingId: string;
  subtitlePosition: string;
  subtitleStyleId: string;
};

const savedStyleByRecordingId = new Map<string, RecordingSubtitleStyleMemory>();

export function rememberRecordingSubtitleStyle(detail: RecordingSubtitleStyleMemory) {
  savedStyleByRecordingId.set(detail.recordingId, detail);
}

export function getRememberedRecordingSubtitleStyle(recordingId: string | undefined) {
  return recordingId ? savedStyleByRecordingId.get(recordingId) : undefined;
}
