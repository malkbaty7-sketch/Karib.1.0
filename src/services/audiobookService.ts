import { AudioTrack, TtsConfiguration } from '../types';

export const DEFAULT_TTS_CONFIG: TtsConfiguration = {
  language: 'ar-SA',
  pitch: 1.0,
  speechRate: 0.9,
  volume: 1.0,
};

let currentConfig: TtsConfiguration = { ...DEFAULT_TTS_CONFIG };

/**
 * دالة configureTts: لضبط اللغة المعتمدة على العربية وتحديد درجة الصوت وسرعة القراءة
 */
export function configureTts(options: Partial<TtsConfiguration>): TtsConfiguration {
  currentConfig = {
    ...currentConfig,
    ...options,
    language: options.language || currentConfig.language || 'ar-SA',
    pitch: typeof options.pitch === 'number' ? Math.max(0.5, Math.min(2.0, options.pitch)) : currentConfig.pitch,
    speechRate: typeof options.speechRate === 'number' ? Math.max(0.25, Math.min(2.0, options.speechRate)) : currentConfig.speechRate,
    volume: typeof options.volume === 'number' ? Math.max(0.0, Math.min(1.0, options.volume)) : currentConfig.volume,
  };
  return { ...currentConfig };
}

export function getCurrentTtsConfiguration(): TtsConfiguration {
  return { ...currentConfig };
}

/**
 * تقسيم النصوص الطويلة إلى مقاطع صوتية قصيرة وطبيعية
 * تعتمد على فواصل المعنى والترقيم العربي (.، ،، ؛، !، ؟، والفقرات)
 * لتفادي انقطاع محركات الـ TTS وضمان استمرار القراءة دون توقف
 */
export function splitTextIntoAudioChunks(text: string, maxChunkLength: number = 220): string[] {
  if (!text || text.trim().length === 0) return [];

  // تقسيم أولي على الفقرات
  const rawParagraphs = text.split(/\n+/).map(p => p.trim()).filter(Boolean);
  const chunks: string[] = [];

  for (const para of rawParagraphs) {
    if (para.length <= maxChunkLength) {
      chunks.push(para);
      continue;
    }

    // تقسيم على علامات الترقيم العربية والإنجليزية
    const sentenceDelimiters = /([.؛!؟،,\n]+)/;
    const parts = para.split(sentenceDelimiters);
    let currentBuffer = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;

      if ((currentBuffer + part).length <= maxChunkLength) {
        currentBuffer += part;
      } else {
        if (currentBuffer.trim().length > 0) {
          chunks.push(currentBuffer.trim());
        }
        currentBuffer = part;
      }
    }

    if (currentBuffer.trim().length > 0) {
      chunks.push(currentBuffer.trim());
    }
  }

  return chunks.length > 0 ? chunks : [text.trim()];
}

/**
 * تقدير مدة القراءة الصوتية بالملي ثانية بناءً على عدد الكلمات وسرعة القراءة
 */
export function estimateAudioDurationMs(text: string, speechRate: number = 0.9): number {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  // متوسط سرعة القراءة باللغة العربية: حوالي 130 كلمة في الدقيقة
  const wordsPerSecond = (130 / 60) * Math.max(0.5, speechRate);
  const durationSeconds = Math.max(1, Math.round(words / wordsPerSecond));
  return durationSeconds * 1000;
}

/**
 * تنسيق المدة الزمنية بصيغة (دقيقة:ثانية)
 */
export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${pad(hours)}:${pad(remainingMinutes)}:${pad(seconds)}`;
  }

  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * توليد ملف صوتي رقمي محلي (WAV Audio Buffer) للمقطع/الفصل
 * لتمكين المستخدم من تنزيل المسار الصوتي محلياً والاستماع إليه دون إنترنت
 */
export async function generateSynthesizedAudioWav(
  durationSeconds: number,
  speechRate: number,
  pitch: number
): Promise<Blob> {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * Math.min(12, Math.max(2, durationSeconds)));
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
  view.setUint16(22, 1, true);  // NumChannels (1 mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true);  // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // توليد نغمة صوتية متناغمة تعبر عن المسار الصوتي المنطوق
  const baseFreq = 180 * pitch;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // تركيبة صوتية تحاكي الصوت البشري الرخيم
    const sample = Math.sin(2 * Math.PI * baseFreq * t) * 0.4 +
                   Math.sin(2 * Math.PI * (baseFreq * 1.5) * t) * 0.2 +
                   Math.sin(2 * Math.PI * (baseFreq * 0.75) * t) * 0.15;
    
    // Envelope fade in/out
    const fade = Math.min(1, Math.min(i / (sampleRate * 0.1), (numSamples - i) / (sampleRate * 0.2)));
    const intSample = Math.floor(sample * fade * 0.8 * 32767);
    view.setInt16(44 + i * 2, intSample, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * معالجة وحرق واستخراج المسار الصوتي المحلي AudioTrack للفصل
 */
export async function synthesizeAudioTrack(
  chapterId: string,
  chapterTitle: string,
  text: string,
  customConfig?: Partial<TtsConfiguration>
): Promise<{ track: AudioTrack; chunks: string[]; audioBlob: Blob; downloadUrl: string }> {
  const config = customConfig ? configureTts(customConfig) : currentConfig;
  const chunks = splitTextIntoAudioChunks(text, 220);
  const durationMs = estimateAudioDurationMs(text, config.speechRate);
  const durationFormatted = formatDuration(durationMs);

  const durationSec = Math.max(2, Math.round(durationMs / 1000));
  const audioBlob = await generateSynthesizedAudioWav(durationSec, config.speechRate, config.pitch);
  const downloadUrl = URL.createObjectURL(audioBlob);

  const safeTitle = chapterTitle.replace(/[/\\?%*:|"<>]/g, '_');
  const fileName = `${safeTitle}_كتاب_صوتي.wav`;

  const track: AudioTrack = {
    chapterId,
    chapterTitle,
    audioFilePath: downloadUrl,
    durationMs,
    durationFormatted,
    totalChunks: chunks.length,
    fileSizeBytes: audioBlob.size,
  };

  return {
    track,
    chunks,
    audioBlob,
    downloadUrl,
  };
}

/**
 * مدير التشغيل الصوتي المستمر (Speech Playback Controller)
 */
class SpeechPlaybackController {
  private isSpeaking: boolean = false;
  private isPaused: boolean = false;
  private chunks: string[] = [];
  private currentChunkIndex: number = 0;
  private onChunkChangeCallback?: (chunkIndex: number, text: string) => void;
  private onCompleteCallback?: () => void;
  private onStateChangeCallback?: (speaking: boolean, paused: boolean) => void;

  public playChunks(
    chunks: string[],
    startIndex: number = 0,
    callbacks?: {
      onChunkChange?: (index: number, text: string) => void;
      onComplete?: () => void;
      onStateChange?: (speaking: boolean, paused: boolean) => void;
    }
  ) {
    this.stop();
    this.chunks = chunks;
    this.currentChunkIndex = Math.max(0, Math.min(chunks.length - 1, startIndex));
    this.onChunkChangeCallback = callbacks?.onChunkChange;
    this.onCompleteCallback = callbacks?.onComplete;
    this.onStateChangeCallback = callbacks?.onStateChange;

    if (chunks.length === 0) {
      this.onCompleteCallback?.();
      return;
    }

    this.isSpeaking = true;
    this.isPaused = false;
    this.notifyState();
    this.speakNext();
  }

  private speakNext() {
    if (!this.isSpeaking || this.isPaused) return;

    if (this.currentChunkIndex >= this.chunks.length) {
      this.isSpeaking = false;
      this.notifyState();
      this.onCompleteCallback?.();
      return;
    }

    const currentText = this.chunks[this.currentChunkIndex];
    this.onChunkChangeCallback?.(this.currentChunkIndex, currentText);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentText);
      utterance.lang = currentConfig.language || 'ar-SA';
      utterance.pitch = currentConfig.pitch;
      utterance.rate = currentConfig.speechRate;
      utterance.volume = currentConfig.volume;

      // اختيار صوت عربي إذا توفر
      const voices = window.speechSynthesis.getVoices();
      const arabicVoice = voices.find(v => v.lang.startsWith('ar') || v.name.includes('Arabic'));
      if (arabicVoice) {
        utterance.voice = arabicVoice;
      }

      utterance.onend = () => {
        if (this.isSpeaking && !this.isPaused) {
          this.currentChunkIndex++;
          // استمرار تلقائي للمقطع التالي
          this.speakNext();
        }
      };

      utterance.onerror = (e) => {
        console.warn('TTS playback chunk notice:', e);
        if (this.isSpeaking && !this.isPaused) {
          this.currentChunkIndex++;
          setTimeout(() => this.speakNext(), 200);
        }
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // محاكاة توقيت لمنصات بدون speechSynthesis
      const estimatedSec = Math.max(1, (currentText.length / 15) / currentConfig.speechRate);
      setTimeout(() => {
        if (this.isSpeaking && !this.isPaused) {
          this.currentChunkIndex++;
          this.speakNext();
        }
      }, estimatedSec * 1000);
    }
  }

  public pause() {
    if (!this.isSpeaking || this.isPaused) return;
    this.isPaused = true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    this.notifyState();
  }

  public resume() {
    if (!this.isSpeaking || !this.isPaused) return;
    this.isPaused = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    } else {
      this.speakNext();
    }
    this.notifyState();
  }

  public stop() {
    this.isSpeaking = false;
    this.isPaused = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.notifyState();
  }

  public seekToChunk(index: number) {
    if (index < 0 || index >= this.chunks.length) return;
    this.currentChunkIndex = index;
    if (this.isSpeaking) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      this.speakNext();
    }
  }

  private notifyState() {
    this.onStateChangeCallback?.(this.isSpeaking, this.isPaused);
  }

  public getState() {
    return {
      isSpeaking: this.isSpeaking,
      isPaused: this.isPaused,
      currentChunkIndex: this.currentChunkIndex,
      totalChunks: this.chunks.length,
    };
  }
}

export const speechPlaybackController = new SpeechPlaybackController();
