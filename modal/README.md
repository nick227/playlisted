# Playlisted Modal Subtitles

Manual POC deploy:

```bash
python3 -m venv .modal-venv
source .modal-venv/bin/activate
pip install modal
python3 -m modal setup
python3 -m modal deploy modal/subtitles.py
```

Set the deployed endpoint URL in the Node worker as `MODAL_SUBTITLES_URL`.
Set the shared bearer token in both places as `MODAL_SUBTITLES_TOKEN`.

Railway web/API should keep `SUBTITLES_PROVIDER=disabled`; it queues rows but does not run transcription.

Railway subtitle worker should run as a separate service with `SUBTITLES_PROVIDER=modal`, `SUBTITLES_WORKER_REQUIRE_MODAL=true`, `SUBTITLES_MODAL_ENABLED=true`, and explicit daily/monthly caps.
