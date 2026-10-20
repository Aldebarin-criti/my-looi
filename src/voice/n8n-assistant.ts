import { recordDiagnosticEvent } from "../diagnostics/diagnostic-log";

export type N8nAssistantResponse = {
  success: boolean;
  speech: string;
  pose?: "happy" | "dance" | "nod" | "look_here" | "sleep" | "cat_play" | string;
  sound?: "happy" | "chirp" | "curious" | "laugh" | "alert" | string;
};

export const DEFAULT_N8N_URL = "https://n8n.uxia.es/webhook/looi-assistant";
const REQUEST_TIMEOUT_MS = 25_000;

/**
 * Servicio de integración entre el robot LOOI y el servidor N8N del usuario.
 * Envía la transcripción de voz del usuario a n8n y devuelve la respuesta hablada
 * y la pose física que ejecutará el robot.
 */
export async function askN8nAssistant(
  transcript: string,
  customWebhookUrl?: string
): Promise<N8nAssistantResponse> {
  const url = (customWebhookUrl && customWebhookUrl.trim()) || DEFAULT_N8N_URL;
  recordDiagnosticEvent("assistant", "n8n-request-start", {
    transcriptLength: transcript.length,
    url,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
      },
      body: JSON.stringify({
        message: transcript,
        transcript: transcript,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const raw = await res.text();
    if (!raw || !raw.trim()) {
      return {
        success: true,
        speech: "He recibido tu orden pero la respuesta ha llegado vacía. Verifica el nodo de respuesta en tu n8n.",
        pose: "nod",
      };
    }

    try {
      const parsed = JSON.parse(raw);
      const speech =
        parsed.speech ||
        parsed.output ||
        parsed.message ||
        parsed.text ||
        raw;
      const pose = parsed.pose || "nod";
      const sound = parsed.sound;
      recordDiagnosticEvent("assistant", "n8n-response-success", {
        speechLength: String(speech).length,
        pose,
        sound,
      });
      return {
        success: true,
        speech: typeof speech === "string" ? speech : JSON.stringify(speech),
        pose,
        sound,
      };
    } catch {
      recordDiagnosticEvent("assistant", "n8n-response-raw-text", {
        textLength: raw.length,
      });
      return {
        success: true,
        speech: raw.trim(),
        pose: "nod",
      };
    }
  } catch (error) {
    clearTimeout(timer);
    const message = error instanceof Error ? error.message : String(error);
    recordDiagnosticEvent("assistant", "n8n-request-failed", { error: message });
    console.warn("[N8nAssistant] Error al conectar con N8N:", message);
    return {
      success: false,
      speech:
        "No he podido conectar con tu asistente n8n. Comprueba que el servidor y el webhook estén activos.",
      pose: "nod",
    };
  }
}
