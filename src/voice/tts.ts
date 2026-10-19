import { createAudioPlayer, setIsAudioActiveAsync, type AudioPlayer, type AudioStatus } from "expo-audio";
import type { TtsStyleId } from "./tts-voices";

export type PreparedTtsAudio = {
  text: string;
  audioUrl: string;
};

type TTSOptions = {
  text: string;
  voiceId?: string;
  styleId?: TtsStyleId;
  speed?: number;
  onPlaybackStart?: () => void;
};

/**
 * Servicio de síntesis de voz en español para el robot LOOI.
 * Reproduce las respuestas habladas en español a través del altavoz
 * usando expo-audio y síntesis gratuita compatible con Android.
 */
class LooiTtsService {
  private activePlayer: AudioPlayer | null = null;
  private isSpeakingActive = false;

  async stop(): Promise<void> {
    this.isSpeakingActive = false;
    if (this.activePlayer) {
      try {
        this.activePlayer.pause();
        this.activePlayer.remove();
      } catch {}
      this.activePlayer = null;
    }
  }

  async speak(options: TTSOptions): Promise<void> {
    await this.stop();
    const text = options.text?.trim();
    if (!text) return;

    this.isSpeakingActive = true;
    const phrases = this.splitPhrases(text);

    let startedTriggered = false;

    for (const phrase of phrases) {
      if (!this.isSpeakingActive) break;

      if (!startedTriggered) {
        startedTriggered = true;
        options.onPlaybackStart?.();
      }

      await this.playPhrase(phrase);
    }

    this.isSpeakingActive = false;
  }

  private splitPhrases(text: string): string[] {
    const rawChunks = text.split(/(?<=[.!?;\n])\s+/);
    const result: string[] = [];
    for (const chunk of rawChunks) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;
      if (trimmed.length <= 160) {
        result.push(trimmed);
      } else {
        const sub = trimmed.split(/(?<=[,])\s+/);
        for (const s of sub) {
          const st = s.trim();
          if (st) result.push(st);
        }
      }
    }
    return result.length > 0 ? result : [text];
  }

  private async playPhrase(phrase: string): Promise<void> {
    if (!this.isSpeakingActive || !phrase.trim()) return;
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=es&client=tw-ob&q=${encodeURIComponent(phrase)}`;
      await setIsAudioActiveAsync(true);
      const player = createAudioPlayer({ uri: url });
      this.activePlayer = player;

      await new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve();
        };

        player.addListener("playbackStatusUpdate", (status: AudioStatus) => {
          if (status.didJustFinish || status.error) {
            done();
          }
        });

        setTimeout(done, 14000);
        player.play();
      });
    } catch (e) {
      console.warn("[TTS] Error al reproducir frase:", e);
    } finally {
      if (this.activePlayer) {
        try {
          this.activePlayer.remove();
        } catch {}
        this.activePlayer = null;
      }
    }
  }

  async prepareAudioUrl(options: { text: string; audioUrl: string }): Promise<PreparedTtsAudio> {
    return { text: options.text, audioUrl: options.audioUrl };
  }

  async playPreparedAudio(
    prepared: PreparedTtsAudio,
    onPlaybackStart?: () => void
  ): Promise<void> {
    await this.speak({ text: prepared.text, onPlaybackStart });
  }

  releasePreparedAudio(_prepared: PreparedTtsAudio): void {}
}

export const ttsService = new LooiTtsService();
