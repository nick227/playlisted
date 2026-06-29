import os
import tempfile

import modal

app = modal.App("playlisted-subtitles")

image = (
    modal.Image.from_registry("nvidia/cuda:12.2.2-cudnn8-runtime-ubuntu22.04", add_python="3.11")
    .apt_install("ffmpeg")
    .pip_install("fastapi", "python-multipart", "faster-whisper")
)


@app.function(
    image=image,
    gpu=os.getenv("MODAL_SUBTITLES_GPU", "T4"),
    timeout=int(os.getenv("MODAL_SUBTITLES_TIMEOUT_SECONDS", "900")),
    secrets=[modal.Secret.from_name("playlisted-subtitles", required_keys=["MODAL_SUBTITLES_TOKEN"])],
)
@modal.asgi_app()
def transcribe():
    from fastapi import File, Form, Header, HTTPException, UploadFile
    from fastapi import FastAPI
    from faster_whisper import WhisperModel

    web_app = FastAPI()

    @web_app.post("/")
    async def handler(
        file: UploadFile = File(...),
        model: str = Form("small"),
        wordTimestamps: str = Form("false"),
        authorization: str | None = Header(default=None),
    ):
        expected = os.getenv("MODAL_SUBTITLES_TOKEN")
        if expected and authorization != f"Bearer {expected}":
            raise HTTPException(status_code=401, detail="Unauthorized")

        suffix = os.path.splitext(file.filename or "audio")[1] or ".audio"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(await file.read())
            audio_path = tmp.name

        try:
            whisper = WhisperModel(
                model,
                device=os.getenv("MODAL_SUBTITLES_DEVICE", "cuda"),
                compute_type=os.getenv("MODAL_SUBTITLES_COMPUTE_TYPE", "float16"),
            )
            segments, info = whisper.transcribe(
                audio_path,
                vad_filter=True,
                word_timestamps=wordTimestamps.lower() == "true",
            )
            payload_segments = []
            words = []
            for segment in segments:
                payload_segments.append({
                    "start": float(segment.start),
                    "end": float(segment.end),
                    "text": segment.text.strip(),
                })
                for word in segment.words or []:
                    words.append({
                        "start": float(word.start),
                        "end": float(word.end),
                        "word": word.word,
                    })

            return {
                "engine": "FASTER_WHISPER",
                "modelName": model,
                "language": getattr(info, "language", None),
                "segments": payload_segments,
                "words": words,
                "phonemes": None,
            }
        finally:
            try:
                os.unlink(audio_path)
            except OSError:
                pass

    return web_app
