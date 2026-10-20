import { Asset } from "expo-asset";
import { createAudioPlayer, setIsAudioActiveAsync, type AudioPlayer, type AudioStatus } from "expo-audio";

export type R2D2SoundKey = "happy" | "chirp" | "curious" | "laugh" | "alert";

const R2D2_ASSETS: Record<R2D2SoundKey, number> = {
  happy: require("../../assets/sounds/r2d2/r2d2_happy.wav"),
  chirp: require("../../assets/sounds/r2d2/r2d2_chirp.wav"),
  curious: require("../../assets/sounds/r2d2/r2d2_curious.wav"),
  laugh: require("../../assets/sounds/r2d2/r2d2_laugh.wav"),
  alert: require("../../assets/sounds/r2d2/r2d2_alert.wav"),
};

let activePlayer: AudioPlayer | null = null;

/**
 * Reproduce un efecto de sonido auténtico sintetizado de R2-D2.
 * @param soundKey Tipo de sonido: "happy", "chirp", "curious", "laugh" o "alert".
 */
export async function playR2D2Sound(soundKey: R2D2SoundKey | string): Promise<void> {
  const key = (soundKey in R2D2_ASSETS ? soundKey : "chirp") as R2D2SoundKey;
  try {
    if (activePlayer) {
      try {
        activePlayer.pause();
        activePlayer.remove();
      } catch {}
      activePlayer = null;
    }

    const [asset] = await Asset.loadAsync(R2D2_ASSETS[key]);
    const uri = asset?.localUri || asset?.uri;
    if (!uri) return;

    await setIsAudioActiveAsync(true);
    const player = createAudioPlayer({ uri });
    activePlayer = player;

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
      player.play();
    });
  } catch (error) {
    console.warn("[R2D2 Sound] Error reproduciendo sonido R2D2:", error);
  } finally {
    if (activePlayer) {
      try {
        activePlayer.remove();
      } catch {}
      activePlayer = null;
    }
  }
}
