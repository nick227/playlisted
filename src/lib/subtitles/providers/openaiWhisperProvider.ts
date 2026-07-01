import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { exec as execCb } from "child_process";
import OpenAI from "openai";

import type { SubtitleProviderInput, SubtitleProviderResult } from "./types.js";
import { srtToSegments } from "../srtUtils.js";
import { segmentsToVtt } from "../vtt.js";

const exec = promisify(execCb);

export async function runOpenAIWhisperProvider(input: SubtitleProviderInput): Promise<SubtitleProviderResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "whisper-"));
  const audioPath = path.join(tempDir, "audio.wav");

  try {
    const stats = await fs.promises.stat(input.audioPath);
    let finalAudioPath = input.audioPath;
    
    // Convert to compressed mp3 to save size, ensuring we stay under 25MB for short audio
    const mp3Path = path.join(tempDir, "audio.mp3");
    await exec(`ffmpeg -y -i "${input.audioPath}" -map 0:a:0 -b:a 64k "${mp3Path}"`);
    finalAudioPath = mp3Path;

    // 3. Send to OpenAI
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(finalAudioPath),
      model: "whisper-1",
      response_format: "srt",
    });

    const srtText = transcription as unknown as string;
    
    // 4. Parse SRT to our segment format
    const segments = srtToSegments(srtText);
    const vttText = segmentsToVtt(segments);

    return {
      provider: "whisper",
      language: "en",
      segments,
    };
  } catch (error) {
    console.error("Whisper Provider Error:", error);
    throw error;
  } finally {
    // Cleanup
    await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
