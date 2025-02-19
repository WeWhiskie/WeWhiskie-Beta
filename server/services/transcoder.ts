import { spawn } from 'child_process';
import { storage } from '../storage';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';

interface TranscodingJob {
  sessionId: number;
  inputUrl: string;
  outputPath: string;
  quality: string;
  bitrate: string;
}

export class StreamTranscoder extends EventEmitter {
  private activeJobs: Map<number, TranscodingJob> = new Map();
  private readonly QUALITIES = {
    '1080p': { resolution: '1920x1080', bitrate: '6000k', audioBitrate: '192k' },
    '720p': { resolution: '1280x720', bitrate: '4000k', audioBitrate: '128k' },
    '480p': { resolution: '854x480', bitrate: '2000k', audioBitrate: '96k' },
    '360p': { resolution: '640x360', bitrate: '1000k', audioBitrate: '64k' }
  };

  constructor() {
    super();
    // Ensure output directory exists
    const outputDir = path.join(process.cwd(), 'stream_output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  async startTranscoding(sessionId: number, inputUrl: string): Promise<void> {
    console.log(`Starting transcoding for session ${sessionId}`);
    const sessionOutputDir = path.join(process.cwd(), 'stream_output', sessionId.toString());
    
    if (!fs.existsSync(sessionOutputDir)) {
      fs.mkdirSync(sessionOutputDir, { recursive: true });
    }

    // Start transcoding for each quality
    for (const [quality, settings] of Object.entries(this.QUALITIES)) {
      const outputPath = path.join(sessionOutputDir, `${quality}.m3u8`);
      
      const job: TranscodingJob = {
        sessionId,
        inputUrl,
        outputPath,
        quality,
        bitrate: settings.bitrate
      };

      await this.startTranscodingJob(job);
      this.activeJobs.set(sessionId, job);
    }

    // Record stream configuration
    await this.recordStreamConfigs(sessionId);
  }

  private async startTranscodingJob(job: TranscodingJob): Promise<void> {
    const { resolution, bitrate, audioBitrate } = this.QUALITIES[job.quality as keyof typeof this.QUALITIES];

    const ffmpeg = spawn('ffmpeg', [
      '-i', job.inputUrl,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-b:v', bitrate,
      '-maxrate', bitrate,
      '-bufsize', `${parseInt(bitrate) * 2}k`,
      '-s', resolution,
      '-c:a', 'aac',
      '-b:a', audioBitrate,
      '-f', 'hls',
      '-hls_time', '4',
      '-hls_playlist_type', 'event',
      '-hls_flags', 'independent_segments',
      '-hls_segment_type', 'mpegts',
      '-hls_segment_filename', `${path.dirname(job.outputPath)}/${job.quality}_%03d.ts`,
      job.outputPath
    ]);

    ffmpeg.stdout.on('data', (data) => {
      console.log(`FFmpeg stdout [${job.sessionId}/${job.quality}]: ${data}`);
    });

    ffmpeg.stderr.on('data', (data) => {
      console.error(`FFmpeg stderr [${job.sessionId}/${job.quality}]: ${data}`);
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        console.error(`FFmpeg process exited with code ${code}`);
        this.emit('error', new Error(`Transcoding failed for session ${job.sessionId}`));
      }
    });

    // Monitor transcoding progress
    this.monitorTranscodingHealth(job);
  }

  private async recordStreamConfigs(sessionId: number): Promise<void> {
    try {
      for (const [quality, settings] of Object.entries(this.QUALITIES)) {
        await storage.createStreamConfig({
          sessionId,
          quality,
          bitrate: parseInt(settings.bitrate),
          framerate: 30,
          keyframeInterval: 2,
          audioQuality: parseInt(settings.audioBitrate),
          enabled: true
        });
      }
    } catch (error) {
      console.error('Error recording stream configurations:', error);
    }
  }

  private monitorTranscodingHealth(job: TranscodingJob): void {
    const healthCheck = setInterval(async () => {
      try {
        // Check if output files are being created and updated
        const segments = fs.readdirSync(path.dirname(job.outputPath))
          .filter(file => file.startsWith(`${job.quality}_`) && file.endsWith('.ts'));
        
        if (segments.length > 0) {
          const latestSegment = segments[segments.length - 1];
          const stats = fs.statSync(path.join(path.dirname(job.outputPath), latestSegment));
          const segmentAge = Date.now() - stats.mtimeMs;

          // Record stream health metrics
          await storage.recordStreamStats({
            sessionId: job.sessionId,
            currentViewers: 0, // This will be updated by the WebSocket server
            peakViewers: 0,
            bandwidth: stats.size, // Latest segment size
            cpuUsage: process.cpuUsage().user / 1000000,
            memoryUsage: process.memoryUsage().heapUsed,
            streamHealth: segmentAge < 10000 ? 100 : 50, // Simple health metric based on segment age
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Error monitoring transcoding health:', error);
      }
    }, 5000); // Check every 5 seconds

    // Cleanup on job completion
    this.once('end', () => {
      clearInterval(healthCheck);
    });
  }

  async stopTranscoding(sessionId: number): Promise<void> {
    const job = this.activeJobs.get(sessionId);
    if (job) {
      // Stop FFmpeg processes
      process.kill(process.pid, 'SIGTERM');
      this.activeJobs.delete(sessionId);
      this.emit('end', sessionId);

      // Cleanup transcoded files
      const sessionOutputDir = path.dirname(job.outputPath);
      fs.rm(sessionOutputDir, { recursive: true, force: true }, (err) => {
        if (err) {
          console.error(`Error cleaning up session ${sessionId} files:`, err);
        }
      });
    }
  }
}

export const streamTranscoder = new StreamTranscoder();
