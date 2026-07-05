#!/usr/bin/env python3

import argparse
import json
import os
import shutil
import signal
import subprocess
import sys
from pathlib import Path


CANCELLED = False


def handle_sigint(signum, frame):
    global CANCELLED
    CANCELLED = True
    print("\n\nCtrl+C received. Finishing current cleanup and stopping safely...\n")


signal.signal(signal.SIGINT, handle_sigint)


def bytes_to_mb(size: int) -> float:
    return size / (1024 * 1024)


def run_command(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def require_binary(name: str):
    if shutil.which(name) is None:
        print(f"Missing required command: {name}")
        print("Install ffmpeg first. You need both ffmpeg and ffprobe available in PATH.")
        sys.exit(1)


def ffprobe_validate(path: Path) -> dict | None:
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        str(path),
    ]

    result = run_command(cmd)

    if result.returncode != 0:
        return None

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        return None

    streams = data.get("streams", [])
    has_video = any(stream.get("codec_type") == "video" for stream in streams)

    if not has_video:
        return None

    return data


def get_video_info(probe: dict) -> dict:
    video_stream = next(
        stream for stream in probe["streams"] if stream.get("codec_type") == "video"
    )

    audio_streams = [
        stream for stream in probe["streams"] if stream.get("codec_type") == "audio"
    ]

    width = int(video_stream.get("width", 0) or 0)
    height = int(video_stream.get("height", 0) or 0)
    codec = video_stream.get("codec_name", "unknown")
    duration = float(probe.get("format", {}).get("duration", 0) or 0)
    bitrate = int(probe.get("format", {}).get("bit_rate", 0) or 0)

    return {
        "width": width,
        "height": height,
        "codec": codec,
        "duration": duration,
        "bitrate": bitrate,
        "audio_count": len(audio_streams),
    }


def build_ffmpeg_command(
    src: Path,
    dst: Path,
    max_height: int | None,
    crf: int,
    preset: str,
    audio_bitrate: str,
) -> list[str]:
    vf = None

    if max_height:
        # Downscale only if taller than max_height.
        # Keeps aspect ratio and ensures even dimensions.
        vf = (
            f"scale='if(gt(ih,{max_height}),-2,iw)':"
            f"'if(gt(ih,{max_height}),{max_height},ih)'"
        )

    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-y",
        "-i",
        str(src),

        # Strip common metadata/chapters.
        "-map_metadata",
        "-1",
        "-map_chapters",
        "-1",

        # Keep video + first audio/subtitle streams if present.
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-map",
        "0:s?",

        # Video compression.
        "-c:v",
        "libx264",
        "-preset",
        preset,
        "-crf",
        str(crf),

        # Browser-friendly pixel format.
        "-pix_fmt",
        "yuv420p",

        # Move moov atom to front for web playback.
        "-movflags",
        "+faststart",

        # Audio compression.
        "-c:a",
        "aac",
        "-b:a",
        audio_bitrate,

        # Subtitles copied when compatible.
        "-c:s",
        "copy",
    ]

    if vf:
        cmd.extend(["-vf", vf])

    cmd.append(str(dst))
    return cmd


def compress_file(
    path: Path,
    min_savings: float,
    max_height: int | None,
    crf: int,
    preset: str,
    audio_bitrate: str,
    dry_run: bool,
):
    global CANCELLED

    original_size = path.stat().st_size
    temp_path = path.with_name(f"{path.stem}.compressed.tmp.mp4")
    backup_path = path.with_name(f"{path.stem}.original.mp4")

    print(f"\nChecking: {path.name}")
    print(f"Original size: {bytes_to_mb(original_size):.2f} MB")

    probe = ffprobe_validate(path)

    if probe is None:
        print("Skipped: invalid or unreadable MP4.")
        return

    info = get_video_info(probe)
    print(
        f"Video: {info['width']}x{info['height']} | "
        f"codec={info['codec']} | "
        f"duration={info['duration']:.1f}s | "
        f"audio streams={info['audio_count']}"
    )

    if dry_run:
        print("Dry run: would attempt compression.")
        return

    if temp_path.exists():
        temp_path.unlink()

    cmd = build_ffmpeg_command(
        src=path,
        dst=temp_path,
        max_height=max_height,
        crf=crf,
        preset=preset,
        audio_bitrate=audio_bitrate,
    )

    print("Compressing... press Ctrl+C to stop after this file cleans up.")

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    try:
        for line in process.stdout:
            if "time=" in line or "frame=" in line:
                print(line.strip(), end="\r")
            if CANCELLED:
                process.terminate()
                break

        process.wait()

    except KeyboardInterrupt:
        CANCELLED = True
        process.terminate()
        process.wait()

    print()

    if CANCELLED:
        if temp_path.exists():
            temp_path.unlink()
        print("Cancelled. Temporary file removed.")
        return

    if process.returncode != 0:
        if temp_path.exists():
            temp_path.unlink()
        print("Skipped: ffmpeg failed.")
        return

    if not temp_path.exists() or temp_path.stat().st_size == 0:
        print("Skipped: compressed output was not created correctly.")
        return

    # Validate compressed result before comparing/replacing.
    if ffprobe_validate(temp_path) is None:
        temp_path.unlink(missing_ok=True)
        print("Skipped: compressed result failed validation.")
        return

    new_size = temp_path.stat().st_size
    savings_ratio = 1 - (new_size / original_size)
    savings_percent = savings_ratio * 100

    print(f"Compressed size: {bytes_to_mb(new_size):.2f} MB")
    print(f"Savings: {savings_percent:.1f}%")

    if savings_ratio >= min_savings:
        if backup_path.exists():
            print(f"Skipped replace: backup already exists: {backup_path.name}")
            temp_path.unlink(missing_ok=True)
            return

        path.rename(backup_path)
        temp_path.rename(path)

        print(f"Saved: replaced original because savings >= {min_savings * 100:.0f}%")
        print(f"Backup kept as: {backup_path.name}")

    else:
        temp_path.unlink(missing_ok=True)
        print(f"Skipped replace: savings below {min_savings * 100:.0f}% threshold.")


def main():
    parser = argparse.ArgumentParser(
        description="Compress MP4 files in a folder and replace only when savings meet a threshold."
    )

    parser.add_argument(
        "folder",
        nargs="?",
        default=".",
        help="Folder containing MP4 files. Default: current folder.",
    )

    parser.add_argument(
        "--min-savings",
        type=float,
        default=0.20,
        help="Minimum savings ratio required to replace original. Default: 0.20",
    )

    parser.add_argument(
        "--max-height",
        type=int,
        default=1080,
        help="Downscale videos taller than this. Use 0 to disable. Default: 1080",
    )

    parser.add_argument(
        "--crf",
        type=int,
        default=26,
        help="H.264 CRF quality. Lower is better/larger, higher is smaller. Good range: 23-30. Default: 26",
    )

    parser.add_argument(
        "--preset",
        default="slow",
        choices=[
            "ultrafast",
            "superfast",
            "veryfast",
            "faster",
            "fast",
            "medium",
            "slow",
            "slower",
            "veryslow",
        ],
        help="x264 compression preset. Slower usually saves more. Default: slow",
    )

    parser.add_argument(
        "--audio-bitrate",
        default="128k",
        help="AAC audio bitrate. Default: 128k",
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and report files without compressing.",
    )

    args = parser.parse_args()

    require_binary("ffmpeg")
    require_binary("ffprobe")

    folder = Path(args.folder).expanduser().resolve()

    if not folder.exists() or not folder.is_dir():
        print(f"Not a folder: {folder}")
        sys.exit(1)

    max_height = None if args.max_height == 0 else args.max_height

    files = sorted(
        path for path in folder.iterdir()
        if path.is_file()
        and path.suffix.lower() == ".mp4"
        and not path.name.endswith(".compressed.tmp.mp4")
        and not path.name.endswith(".original.mp4")
    )

    if not files:
        print("No MP4 files found.")
        return

    print(f"Folder: {folder}")
    print(f"Found {len(files)} MP4 file(s).")
    print(f"Minimum savings required: {args.min_savings * 100:.0f}%")
    print(f"Max height: {max_height if max_height else 'disabled'}")
    print(f"CRF: {args.crf}")
    print(f"Preset: {args.preset}")
    print(f"Audio bitrate: {args.audio_bitrate}")

    for index, path in enumerate(files, start=1):
        if CANCELLED:
            break

        print(f"\n[{index}/{len(files)}]")
        compress_file(
            path=path,
            min_savings=args.min_savings,
            max_height=max_height,
            crf=args.crf,
            preset=args.preset,
            audio_bitrate=args.audio_bitrate,
            dry_run=args.dry_run,
        )

    if CANCELLED:
        print("\nStopped by user.")
    else:
        print("\nDone.")


if __name__ == "__main__":
    main()