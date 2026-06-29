#!/usr/bin/env python3
import argparse
import json
import os
import sys


def main():
    parser = argparse.ArgumentParser(description="Transcribe audio with faster-whisper.")
    parser.add_argument("audio_path")
    parser.add_argument("--model", default="tiny")
    parser.add_argument("--language", default=None)
    args = parser.parse_args()

    try:
        from faster_whisper import WhisperModel
    except Exception as exc:
        print(f"faster-whisper is not installed or could not be imported: {exc}", file=sys.stderr)
        return 2

    try:
        model = WhisperModel(
            args.model,
            device=os.getenv("SUBTITLES_DEVICE", "cpu"),
            compute_type=os.getenv("SUBTITLES_COMPUTE_TYPE", "int8"),
        )
        vad_filter = os.getenv("SUBTITLES_VAD_FILTER", "true").lower() == "true"
        segments, info = model.transcribe(args.audio_path, language=args.language, vad_filter=vad_filter)
        payload_segments = []
        for segment in segments:
            payload_segments.append({
                "start": float(segment.start),
                "end": float(segment.end),
                "text": segment.text.strip(),
            })

        print(json.dumps({
            "language": getattr(info, "language", None),
            "segments": payload_segments,
        }))
        return 0
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
