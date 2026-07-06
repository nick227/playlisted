#!/usr/bin/env python3

import argparse
import json
import shutil
import signal
import subprocess
import sys
from pathlib import Path


CANCELLED = False


PROFILES = {
    # Best default: very small, still usable for web preview/theatre/background clips.
    "aggressive": {
        "max_seconds": 30,
        "max_height": 540,
        "fps": 24,
        "crf": 31,
        "preset": "veryslow",
        "audio": "none",
        "target_mb": 3.0,
    },

    # Smaller. Quality loss is visible but acceptable for motion previews.
    "brutal": {
        "max_seconds": 30,
        "max_height": 480,
        "fps": 20,
        "crf": 33,
        "preset": "veryslow",
        "audio": "none",
        "target_mb": 2.0,
    },

    # Tiny. Use when file size matters more than polish.
    "thumbnail": {
        "max_seconds": 30,
        "max_height": 360,
        "fps": 18,
        "crf": 35,
        "preset": "veryslow",
        "audio": "none",
        "target_mb": 1.2,
    },
}


VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".webm", ".mkv", ".avi"}


def handle_sigint(signum, frame):
    global CANCELLED
    CANCELLED = True
    print("\n\nCtrl+C received. Cleaning up current temp file and stopping safely...\n")


signal.signal(signal.SIGINT, handle_sigint)


def require_binary(name: str):
    if shutil.which(name) is None:
        print(f"Missing required command: {name}")
        print("Install ffmpeg first. You need both ffmpeg and ffprobe available in PATH.")
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


def mb_to_bytes(size: float) -> int:
    return int(size * 1024 * 1024)


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


def get_video_info(probe_data: dict) -> dict:
    video_stream = next(
        stream for stream in probe_data["streams"]
        if stream.get("codec_type") == "video"
    )

    audio_streams = [
        stream for stream in probe_data["streams"]
        if stream.get("codec_type") == "audio"
    ]

    duration = probe_data.get("format", {}).get("duration") or 0

    try:
        duration = float(duration)
    except ValueError:
        duration = 0.0

    return {
        "width": int(video_stream.get("width", 0) or 0),
        "height": int(video_stream.get("height", 0) or 0),
        "codec": video_stream.get("codec_name", "unknown"),
        "duration": duration,
        "audio_count": len(audio_streams),
    }


def human_mb(size: int) -> str:
    return f"{bytes_to_mb(size):.2f} MB"


def build_ffmpeg_command(
    src: Path,
    dst: Path,
    max_seconds: int,
    max_height: int,
    fps: int,
    crf: int,
    preset: str,
    audio: str,
) -> list[str]:
    vf = (
        f"scale='if(gt(ih,{max_height}),-2,iw)':"
        f"'if(gt(ih,{max_height}),{max_height},ih)',"
        f"fps={fps}"
    )

    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-y",

        # Read input.
        "-i",
        str(src),

        # Hard cap duration.
        "-t",
        str(max_seconds),

        # Keep only first video stream.
        "-map",
        "0:v:0",

        # Drop metadata, chapters, subtitles, data streams.
        "-map_metadata",
        "-1",
        "-map_chapters",
        "-1",
        "-sn",
        "-dn",

        # Resize + reduce frame rate.
        "-vf",
        vf,

        # Small, browser-safe MP4.
        "-c:v",
        "libx264",
        "-preset",
        preset,
        "-crf",
        str(crf),
        "-pix_fmt",
        "yuv420p",

        # Improve compression a bit for previews.
        "-profile:v",
        "main",
        "-level",
        "4.0",

        # Web playback layout.
        "-movflags",
        "+faststart",
    ]

    if audio == "none":
        cmd.extend(["-an"])
    elif audio == "tiny":
        cmd.extend([
            "-map",
            "0:a:0?",
            "-c:a",
            "aac",
            "-b:a",
            "48k",
            "-ac",
            "1",
            "-ar",
            "22050",
        ])
    else:
        raise ValueError(f"Unknown audio mode: {audio}")

    cmd.append(str(dst))
    return cmd


def encode_video(
    src: Path,
    dst: Path,
    max_seconds: int,
    max_height: int,
    fps: int,
    crf: int,
    preset: str,
    audio: str,
) -> int:
    cmd = build_ffmpeg_command(
        src=src,
        dst=dst,
        max_seconds=max_seconds,
        max_height=max_height,
        fps=fps,
        crf=crf,
        preset=preset,
        audio=audio,
    )

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


def candidate_settings(profile: dict, force_target: bool):
    base_height = profile["max_height"]
    base_fps = profile["fps"]
    base_crf = profile["crf"]

    candidates = [
        (base_height, base_fps, base_crf),
        (base_height, max(15, base_fps - 4), base_crf + 1),
        (480, 20, max(base_crf, 33)),
        (420, 18, max(base_crf, 34)),
        (360, 18, max(base_crf, 35)),
    ]

    if force_target:
        candidates.extend([
            (320, 15, 36),
            (288, 15, 37),
            (240, 12, 38),
        ])

    # Remove duplicates while preserving order.
    seen = set()
    unique = []

    for item in candidates:
        if item not in seen:
            seen.add(item)
            unique.append(item)

    return unique


def process_file(path: Path, profile: dict, dry_run: bool, force_target: bool):
    global CANCELLED

    original_size = path.stat().st_size
    original_probe = ffprobe(path)

    print(f"\nChecking: {path.name}")
    print(f"Original size: {human_mb(original_size)}")

    if original_probe is None:
        print("Skipped: invalid or unreadable video.")
        return

    info = get_video_info(original_probe)

    print(
        f"Video: {info['width']}x{info['height']} | "
        f"codec={info['codec']} | "
        f"duration={info['duration']:.1f}s | "
        f"audio streams={info['audio_count']}"
    )

    output_path = path.with_suffix(".mp4")
    temp_path = path.with_name(f"{path.stem}.tiny.tmp.mp4")
    backup_path = path.with_name(f"{path.stem}.original{path.suffix}")

    if backup_path.exists():
        print(f"Skipped: backup already exists: {backup_path.name}")
        print("This file was probably already processed.")
        return

    if dry_run:
        print(
            "Dry run: would trim/re-encode to "
            f"{profile['max_seconds']}s max, "
            f"{profile['max_height']}p, "
            f"{profile['fps']}fps, "
            f"CRF {profile['crf']}, "
            f"audio={profile['audio']}."
        )
        return

    target_bytes = mb_to_bytes(profile["target_mb"])
    best_temp = None
    best_size = None
    best_settings = None

    if temp_path.exists():
        temp_path.unlink()

    for max_height, fps, crf in candidate_settings(profile, force_target):
        if CANCELLED:
            break

        attempt_path = path.with_name(
            f"{path.stem}.tiny.{max_height}p.{fps}fps.crf{crf}.tmp.mp4"
        )

        if attempt_path.exists():
            attempt_path.unlink()

        print(
            f"Encoding candidate: max={max_height}px, fps={fps}, "
            f"CRF={crf}, audio={profile['audio']}..."
        )

        returncode = encode_video(
            src=path,
            dst=attempt_path,
            max_seconds=profile["max_seconds"],
            max_height=max_height,
            fps=fps,
            crf=crf,
            preset=profile["preset"],
            audio=profile["audio"],
        )

        if CANCELLED or returncode == 130:
            attempt_path.unlink(missing_ok=True)
            break

        if returncode != 0:
            attempt_path.unlink(missing_ok=True)
            print("Candidate failed.")
            continue

        if not attempt_path.exists() or attempt_path.stat().st_size == 0:
            attempt_path.unlink(missing_ok=True)
            print("Candidate was empty.")
            continue

        if ffprobe(attempt_path) is None:
            attempt_path.unlink(missing_ok=True)
            print("Candidate failed validation.")
            continue

        attempt_size = attempt_path.stat().st_size
        print(f"Candidate size: {human_mb(attempt_size)}")

        if best_size is None or attempt_size < best_size:
            if best_temp:
                best_temp.unlink(missing_ok=True)

            best_temp = attempt_path
            best_size = attempt_size
            best_settings = (max_height, fps, crf)
        else:
            attempt_path.unlink(missing_ok=True)

        if attempt_size <= target_bytes:
            print(f"Hit target <= {profile['target_mb']:.1f} MB.")
            break

    if CANCELLED:
        if best_temp:
            best_temp.unlink(missing_ok=True)
        print("Cancelled. Temporary files removed.")
        return

    if best_temp is None or best_size is None or best_settings is None:
        print("Skipped: no valid compressed output created.")
        return

    savings_percent = (1 - best_size / original_size) * 100
    max_height, fps, crf = best_settings

    if best_size >= original_size:
        best_temp.unlink(missing_ok=True)
        print("Skipped replace: compressed file was not smaller.")
        return

    # Backup original, then replace/create final MP4.
    path.rename(backup_path)

    if output_path.exists() and output_path != path:
        output_path.unlink()

    best_temp.rename(output_path)

    print(
        f"Saved: {path.name} → {output_path.name}\n"
        f"Final size: {human_mb(original_size)} → {human_mb(best_size)} "
        f"({savings_percent:.1f}% savings)\n"
        f"Final settings: max={max_height}px, fps={fps}, CRF={crf}, "
        f"audio={profile['audio']}\n"
        f"Backup kept as: {backup_path.name}"
    )


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Aggressively trim and compress videos into tiny MP4 previews. "
            "Drops metadata, subtitles, data streams, and audio by default."
        )
    )

    parser.add_argument(
        "folder",
        nargs="?",
        default=".",
        help="Folder containing videos. Default: current folder.",
    )

    parser.add_argument(
        "--profile",
        choices=sorted(PROFILES.keys()),
        default="aggressive",
        help="Compression profile. Default: aggressive.",
    )

    parser.add_argument(
        "--audio",
        choices=["none", "tiny"],
        default=None,
        help="Override audio mode. Default comes from selected profile.",
    )

    parser.add_argument(
        "--target-mb",
        type=float,
        default=None,
        help="Override target MB. Default comes from selected profile.",
    )

    parser.add_argument(
        "--force-target",
        action="store_true",
        help="Allow extra-low fallback candidates if needed to hit target size.",
    )

    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report what would happen without changing files.",
    )

    args = parser.parse_args()

    require_binary("ffmpeg")
    require_binary("ffprobe")

    folder = Path(args.folder).expanduser().resolve()

    if not folder.exists() or not folder.is_dir():
        print(f"Not a folder: {folder}")
        sys.exit(1)

    profile = dict(PROFILES[args.profile])

    if args.audio is not None:
        profile["audio"] = args.audio

    if args.target_mb is not None:
        profile["target_mb"] = args.target_mb

    files = sorted(
        path for path in folder.iterdir()
        if path.is_file()
        and path.suffix.lower() in VIDEO_EXTS
        and ".tiny." not in path.name
        and not path.name.endswith(".tiny.tmp.mp4")
        and ".original" not in path.name
    )

    if not files:
        print("No video files found.")
        return

    print(f"Folder: {folder}")
    print(f"Found {len(files)} video file(s).")
    print(f"Profile: {args.profile}")
    print(f"Max duration: {profile['max_seconds']}s")
    print(f"Max height: {profile['max_height']}px")
    print(f"FPS: {profile['fps']}")
    print(f"CRF: {profile['crf']}")
    print(f"Preset: {profile['preset']}")
    print(f"Audio: {profile['audio']}")
    print(f"Target: {profile['target_mb']:.1f} MB")
    print(f"Mode: {'dry run' if args.dry_run else 'replace with backup'}")

    for index, path in enumerate(files, start=1):
        if CANCELLED:
            break

        print(f"\n[{index}/{len(files)}]")
        process_file(
            path=path,
            profile=profile,
            dry_run=args.dry_run,
            force_target=args.force_target,
        )

    if CANCELLED:
        print("\nStopped by user.")
    else:
        print("\nDone.")


if __name__ == "__main__":
    main()