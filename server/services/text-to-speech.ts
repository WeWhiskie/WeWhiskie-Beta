import { createHash } from 'crypto';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const exists = promisify(fs.exists);

interface TTSOptions {
  text: string;
  voice?: string;
  speed?: number;
  pitch?: number;
}

class TextToSpeechService {
  private cacheDir: string;
  private voices: Map<string, any>;

  constructor() {
    this.cacheDir = path.join(process.cwd(), 'attached_assets', 'tts-cache');
    this.voices = new Map([
      ['highland', { name: 'en-GB', accent: 'Scottish' }],
      ['speyside', { name: 'en-GB', accent: 'Scottish' }],
      ['islay', { name: 'en-GB', accent: 'Scottish' }],
      ['irish', { name: 'en-IE', accent: 'Irish' }],
      ['american', { name: 'en-US', accent: 'American' }],
    ]);

    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private generateCacheKey(options: TTSOptions): string {
    const data = JSON.stringify(options);
    return createHash('md5').update(data).digest('hex');
  }

  private async getFromCache(key: string): Promise<Buffer | null> {
    const cachePath = path.join(this.cacheDir, `${key}.mp3`);
    if (await exists(cachePath)) {
      return readFile(cachePath);
    }
    return null;
  }

  private async saveToCache(key: string, audioBuffer: Buffer): Promise<void> {
    const cachePath = path.join(this.cacheDir, `${key}.mp3`);
    await writeFile(cachePath, audioBuffer);
  }

  async synthesizeSpeech(options: TTSOptions): Promise<{ audioUrl: string }> {
    try {
      const cacheKey = this.generateCacheKey(options);
      const cachedAudio = await this.getFromCache(cacheKey);

      if (cachedAudio) {
        return {
          audioUrl: `/attached_assets/tts-cache/${cacheKey}.mp3`
        };
      }

      // Create a fallback audio file with a simple tone
      const sampleRate = 44100;
      const duration = 1; // 1 second
      const frequency = 440; // A4 note
      const numSamples = sampleRate * duration;

      const audioData = new Float32Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        audioData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
      }

      // Convert to WAV format
      const wavBuffer = Buffer.alloc(44 + numSamples * 2);

      // Write WAV header
      wavBuffer.write('RIFF', 0);
      wavBuffer.writeUInt32LE(36 + numSamples * 2, 4);
      wavBuffer.write('WAVE', 8);
      wavBuffer.write('fmt ', 12);
      wavBuffer.writeUInt32LE(16, 16);
      wavBuffer.writeUInt16LE(1, 20);
      wavBuffer.writeUInt16LE(1, 22);
      wavBuffer.writeUInt32LE(sampleRate, 24);
      wavBuffer.writeUInt32LE(sampleRate * 2, 28);
      wavBuffer.writeUInt16LE(2, 32);
      wavBuffer.writeUInt16LE(16, 34);
      wavBuffer.write('data', 36);
      wavBuffer.writeUInt32LE(numSamples * 2, 40);

      // Write audio data
      for (let i = 0; i < numSamples; i++) {
        const sample = Math.floor(audioData[i] * 32767);
        wavBuffer.writeInt16LE(sample, 44 + i * 2);
      }

      await this.saveToCache(cacheKey, wavBuffer);

      return {
        audioUrl: `/attached_assets/tts-cache/${cacheKey}.mp3`
      };
    } catch (error) {
      console.error('Error synthesizing speech:', error);
      throw new Error('Failed to synthesize speech');
    }
  }
}

export const textToSpeechService = new TextToSpeechService();