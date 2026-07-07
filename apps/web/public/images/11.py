#!/usr/bin/env python3

from pathlib import Path
from PIL import Image, ImageOps
import os
import shutil
import sys
import tempfile

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}

TARGET_MAX_BYTES = 1_000_000
START_MAX_DIMENSION = 1080
MIN_DIMENSION = 480

QUALITY_START = 86
QUALITY_MIN = 72
QUALITY_STEP = 4

RESIZE_STEP = 0.88

MAKE_BACKUPS = True
DELETE_ORIGINAL_AFTER_SUCCESS = True


def human_size(num_bytes: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if num_bytes < 1024:
            return f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024
    return f"{num_bytes:.1f} TB"


def normalize_image(img: Image.Image) -> Image.Image:
    img = ImageOps.exif_transpose(img)

    if img.mode in ("RGBA", "LA"):
        return img.convert("RGBA")

    if img.mode == "P" and "transparency" in img.info:
        return img.convert("RGBA")

    return img.convert("RGB")


def resize_to_max_dimension(img: Image.Image, max_dimension: int) -> Image.Image:
    width, height = img.size
    largest = max(width, height)

    if largest <= max_dimension:
        return img.copy()

    scale = max_dimension / largest
    new_size = (round(width * scale), round(height * scale))

    return img.resize(new_size, Image.Resampling.LANCZOS)


def save_webp(img: Image.Image, path: Path, quality: int) -> None:
    img.save(
        path,
        "WEBP",
        quality=quality,
        method=6,
        optimize=True,
        exif=b"",
        icc_profile=b"",
        xmp=b"",
    )


def make_candidate(original_img: Image.Image, max_dimension: int, quality: int) -> tuple[Path, int, tuple[int, int]]:
    resized = resize_to_max_dimension(original_img, max_dimension)

    fd, temp_name = tempfile.mkstemp(suffix=".webp")
    os.close(fd)

    temp_path = Path(temp_name)
    save_webp(resized, temp_path, quality)

    return temp_path, temp_path.stat().st_size, resized.size


def find_best_candidate(original_img: Image.Image) -> tuple[Path | None, int | None, int | None, int | None, tuple[int, int] | None]:
    best_path = None
    best_size = None
    best_quality = None
    best_dimension = None
    best_image_size = None

    max_dimension = START_MAX_DIMENSION

    while max_dimension >= MIN_DIMENSION:
        for quality in range(QUALITY_START, QUALITY_MIN - 1, -QUALITY_STEP):
            temp_path, candidate_size, image_size = make_candidate(original_img, max_dimension, quality)

            if best_size is None or candidate_size < best_size:
                if best_path:
                    best_path.unlink(missing_ok=True)

                best_path = temp_path
                best_size = candidate_size
                best_quality = quality
                best_dimension = max_dimension
                best_image_size = image_size
            else:
                temp_path.unlink(missing_ok=True)

            if candidate_size <= TARGET_MAX_BYTES:
                return temp_path, candidate_size, quality, max_dimension, image_size

        max_dimension = round(max_dimension * RESIZE_STEP)

    return best_path, best_size, best_quality, best_dimension, best_image_size


def backup_original(input_path: Path) -> None:
    if not MAKE_BACKUPS:
        return

    backup_path = input_path.with_suffix(input_path.suffix + ".bak")

    if not backup_path.exists():
        shutil.copy2(input_path, backup_path)


def compress_one(input_path: Path) -> tuple[bool, str]:
    original_size = input_path.stat().st_size
    output_path = input_path.with_suffix(".webp")

    try:
        with Image.open(input_path) as opened:
            original_img = normalize_image(opened)
    except Exception as exc:
        return False, f"ERROR {input_path.name}: could not open image: {exc}"

    candidate_path = None

    try:
        candidate_path, candidate_size, quality, max_dimension, image_size = find_best_candidate(original_img)

        if candidate_path is None or candidate_size is None:
            return False, f"ERROR {input_path.name}: no candidate created"

        under_target = candidate_size <= TARGET_MAX_BYTES
        savings = 1 - (candidate_size / original_size)

        backup_original(input_path)

        if input_path.suffix.lower() == ".webp":
            shutil.move(str(candidate_path), str(input_path))
            final_path = input_path
        else:
            shutil.move(str(candidate_path), str(output_path))
            final_path = output_path

            if DELETE_ORIGINAL_AFTER_SUCCESS:
                input_path.unlink()

        status = "COMPRESSED" if under_target else "BEST-EFFORT"

        return True, (
            f"{status} {input_path.name} → {final_path.name}: "
            f"{human_size(original_size)} → {human_size(candidate_size)} "
            f"({savings:.0%} savings, q={quality}, max={max_dimension}px, actual={image_size[0]}x{image_size[1]})"
        )

    finally:
        if candidate_path and candidate_path.exists():
            candidate_path.unlink(missing_ok=True)


def main() -> int:
    folder = Path.cwd()

    images = [
        p for p in folder.iterdir()
        if p.is_file()
        and p.suffix.lower() in IMAGE_EXTS
        and not p.name.endswith(".bak")
        and p.name != Path(__file__).name
    ]

    if not images:
        print("No PNG, JPG, JPEG, or WEBP files found.")
        return 0

    print(f"Scanning {len(images)} image(s) in {folder}")
    print(f"Target max file size: {human_size(TARGET_MAX_BYTES)}")
    print(f"Starting max dimension: {START_MAX_DIMENSION}px")
    print(f"Minimum quality floor: {QUALITY_MIN}")
    print(f"Minimum dimension floor: {MIN_DIMENSION}px")
    print()

    changed = 0
    failed = 0

    try:
        for image_path in images:
            success, message = compress_one(image_path)
            print(message)

            if success:
                changed += 1
            else:
                failed += 1

    except KeyboardInterrupt:
        print("\nCancelled by user.")
        return 130

    print()
    print(f"Done. Processed: {changed}. Failed: {failed}.")

    oversized = [
        p for p in folder.iterdir()
        if p.is_file()
        and p.suffix.lower() in IMAGE_EXTS
        and not p.name.endswith(".bak")
        and p.stat().st_size > TARGET_MAX_BYTES
    ]

    if oversized:
        print()
        print("Still over 1 MB after best-effort compression:")
        for p in oversized:
            print(f" - {p.name}: {human_size(p.stat().st_size)}")
        print()
        print("To force harder compression, lower QUALITY_MIN or MIN_DIMENSION.")

    return 0


if __name__ == "__main__":
    sys.exit(main())