import {
  moveLooi,
  turnLooi,
  performLooiDance,
  setLooiHead,
  stopLooiMotion,
  getLooiRobotRuntimeState,
} from "../device-tools/looi-robot";
import { playR2D2Sound } from "../voice/r2d2-sounds";
import { recordDiagnosticEvent } from "../diagnostics/diagnostic-log";

let catPlayActive = false;
let catPlayAbortController: AbortController | null = null;

export function isCatPlayActive(): boolean {
  return catPlayActive;
}

export function stopCatPlayMode(reason = "user-stop"): void {
  if (!catPlayActive) return;
  catPlayActive = false;
  catPlayAbortController?.abort();
  catPlayAbortController = null;
  void stopLooiMotion(`cat-play-stop-${reason}`).catch(() => undefined);
  void setLooiHead("center").catch(() => undefined);
  recordDiagnosticEvent("robot", "cat-play-stopped", { reason });
  console.log("[CatPlay] Modo juego con gatos detenido:", reason);
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("aborted"));
    const timer = setTimeout(() => resolve(), ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new Error("aborted"));
    });
  });

/**
 * Inicia el Modo Juego con Gatos (Cat Chaser & Tag).
 * Diseñado con patrones de movimiento que provocan el instinto de caza y juego felino:
 * - Movimientos rápidos impredecibles
 * - Pausas de acecho ("congelado")
 * - Pitidos curiosos y de alarma estilo R2-D2
 * - Fintas y huida hacia atrás para que el gato lo persiga
 */
export async function startCatPlayMode(): Promise<void> {
  if (catPlayActive) {
    stopCatPlayMode("restart");
    await sleep(400);
  }

  const robot = getLooiRobotRuntimeState();
  if (!robot.connected) {
    console.warn("[CatPlay] No se puede iniciar el juego: robot no conectado por Bluetooth");
    return;
  }

  catPlayActive = true;
  const abortController = new AbortController();
  catPlayAbortController = abortController;
  const signal = abortController.signal;

  recordDiagnosticEvent("robot", "cat-play-started");
  console.log("[CatPlay] ¡Modo Juego con Gatos INICIADO!");

  try {
    // 1. Inicio: Llamada de atención al gato
    void playR2D2Sound("curious");
    await setLooiHead("down");
    await sleep(600, signal);
    await setLooiHead("up");
    await sleep(500, signal);

    // Ciclo de juego interactivo (5 rondas de provocación y persecución)
    for (let round = 1; round <= 5 && catPlayActive; round += 1) {
      if (signal.aborted) break;

      console.log(`[CatPlay] Ronda ${round}/5`);

      // Fase A: Acecho lento y curiosidad
      void playR2D2Sound("chirp");
      await setLooiHead("center");
      // Giro aleatorio para buscar al gato
      const searchTurn = round % 2 === 0 ? "left" : "right";
      await turnLooi(searchTurn, 90);
      await sleep(500, signal);

      // Avance lento de provocación (como presa sigilosa)
      await moveLooi("forward", 600, 35);
      await sleep(400, signal);

      // Fase B: ¡Sprint repentino hacia el gato!
      void playR2D2Sound("happy");
      await moveLooi("forward", 450, 65);
      // Freno en seco
      await stopLooiMotion("cat-play-freeze");
      await sleep(1000, signal); // Pausa quieto: los gatos atacan cuando se frena

      // Fase C: ¡Pánico cómico y huida para que el gato lo persiga a él!
      void playR2D2Sound("alert");
      await turnLooi("left", 180); // Da media vuelta
      await sleep(200, signal);
      await moveLooi("forward", 800, 70); // Huye rápido
      await sleep(600, signal);

      // Fase D: Pequeña celebración / baile
      if (round % 2 === 1) {
        void playR2D2Sound("laugh");
        await performLooiDance("random").catch(() => undefined);
        await sleep(800, signal);
      }
    }

    // Fin del juego
    void playR2D2Sound("happy");
    await setLooiHead("center");
  } catch (e) {
    // Aborted or cancelled
  } finally {
    catPlayActive = false;
    catPlayAbortController = null;
    void setLooiHead("center").catch(() => undefined);
  }
}
