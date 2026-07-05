#!/usr/bin/env python3

import argparse
import json
import shutil
import signal
import subprocess
import sys
from pathlib import Path


CANCELLED = False


def handle_sigint(signum, frame):
    global CANCELLED
    CANCELLED = True
    print("\n\nCtrl+C received. Stopping safely...\n")


signal.signal(signal.SIGINT, handle_sigint)


def require_binary(name: str):
    if shutil.which(name) is None:
        print(f"Missing required command: {name}")
        print("Install ffmpeg first. You need both ffmpeg and ffprobe in PATH.")
        sys.exit(1)


def run_command(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def bytes_to_mb(size: int) -> float:
    return size / (1024 * 1024)


def ffprobe(path: Path) -> dict | None:
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


def get_duration_seconds(probe_data: dict) -> float:
    duration = probe_data.get("format", {}).get("duration")

    if duration is None:
        return 0.0

    try:
        return float(duration)
    except ValueError:
        return 0.0


def trim_fast_copy(src: Path, dst: Path, max_seconds: int) -> int:
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-y",

        # Input.
        "-i",
        str(src),

        # Keep first N seconds.
        "-t",
        str(max_seconds),

        # Fast trim: no re-encode.
        "-c",
        "copy",

        # Strip metadata/chapters while we are touching the file.
        "-map_metadata",
        "-1",
        "-map_chapters",
        "-1",

        # Web-friendly MP4 layout.
        "-movflags",
        "+faststart",

        str(dst),
    ]

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )

    try:
        for line in process.stdout:
            if CANCELLED:
                process.terminate()
                break

            if "time=" in line or "frame=" in line:
                print(line.strip(), end="\r")

        process.wait()

    except KeyboardInterrupt:
        process.terminate()
        process.wait()
        return 130

    print()
    return process.returncode


def process_file(path: Path, max_seconds: int, dry_run: bool):
    global CANCELLED

    original_size = path.stat().st_size
    temp_path = path.with_name(f"{path.stem}.trimmed.tmp.mp4")
    backup_path = path.with_name(f"{path.stem}.original.mp4")

    print(f"\nChecking: {path.name}")
    print(f"Original size: {bytes_to_mb(original_size):.2f} MB")

    probe_data = ffprobe(path)

    if probe_data is None:
        print("Skipped: invalid or unreadable MP4.")
        return

    duration = get_duration_seconds(probe_data)
    print(f"Duration: {duration:.1f}s")

    if duration <= max_seconds:
        print(f"Skipped: already <= {max_seconds}s.")
        return

    if backup_path.exists():
        print(f"Skipped: backup already exists: {backup_path.name}")
        print("This file was probably already processed.")
        return

    if dry_run:
        estimated_savings = max(0, 1 - (max_seconds / duration)) * 100
        print(f"Dry run: would trim to first {max_seconds}s.")
        print(f"Rough possible savings: {estimated_savings:.1f}% before container overhead.")
        return

    if temp_path.exists():
        temp_path.unlink()

    print(f"Trimming to first {max_seconds}s using fast stream copy...")
    returncode = trim_fast_copy(path, temp_path, max_seconds)

    if CANCELLED or returncode == 130:
        temp_path.unlink(missing_ok=True)
        print("Cancelled. Temporary file removed.")
        return

    if returncode != 0:
        temp_path.unlink(missing_ok=True)
        print("Skipped: ffmpeg trim failed.")
        return

    if not temp_path.exists() or temp_path.stat().st_size == 0:
        temp_path.unlink(missing_ok=True)
        print("Skipped: trimmed output was not created correctly.")
        return

    trimmed_probe = ffprobe(temp_path)

    if trimmed_probe is None:
        temp_path.unlink(missing_ok=True)
        print("Skipped: trimmed output failed validation.")
        return

    trimmed_duration = get_duration_seconds(trimmed_probe)
    trimmed_size = temp_path.stat().st_size
    savings_percent = (1 - trimmed_size / original_size) * 100

    print(f"Trimmed duration: {trimmed_duration:.1f}s")
    print(f"Trimmed size: {bytes_to_mb(trimmed_size):.2f} MB")
    print(f"Savings: {savings_percent:.1f}%")

    if trimmed_size >= original_size:
        temp_path.unlink(missing_ok=True)
        print("Skipped replace: trimmed file was not smaller.")
        return

    path.rename(backup_path)
    temp_path.rename(path)

    print("Saved: original replaced with trimmed version.")
    print(f"Backup kept as: {backup_path.name}")


def main():
    parser = argparse.ArgumentParser(
        description="Trim MP4 files longer than a target duration using fast stream copy."
    )

    parser.add_argument(
        "folder",
        nargs="?",
        default=".",
        help="Folder containing MP4 files. Default: current folder.",
    )

    parser.add_argument(
        "--max-seconds",
        type=int,
        default=60,
        help="Trim files longer than this to this many seconds. Default: 60.",
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only report what would be trimmed.",
    )

    args = parser.parse_args()

    require_binary("ffmpeg")
    require_binary("ffprobe")

    folder = Path(args.folder).expanduser().resolve()

    if not folder.exists() or not folder.is_dir():
        print(f"Not a folder: {folder}")
        sys.exit(1)

    files = sorted(
        path for path in folder.iterdir()
        if path.is_file()
        and path.suffix.lower() == ".mp4"
        and not path.name.endswith(".original.mp4")
        and not path.name.endswith(".trimmed.tmp.mp4")
        and not path.name.endswith(".compressed.tmp.mp4")
    )

    if not files:
        print("No MP4 files found.")
        return

    print(f"Folder: {folder}")
    print(f"Found {len(files)} MP4 file(s).")
    print(f"Target max duration: {args.max_seconds}s")
    print(f"Mode: {'dry run' if args.dry_run else 'replace with backup'}")

    for index, path in enumerate(files, start=1):
        if CANCELLED:
            break

        print(f"\n[{index}/{len(files)}]")
        process_file(
            path=path,
            max_seconds=args.max_seconds,
            dry_run=args.dry_run,
        )

    if CANCELLED:
        print("\nStopped by user.")
    else:
        print("\nDone.")


if __name__ == "__main__":
    main()