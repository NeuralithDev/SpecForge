import { NextRequest } from "next/server";
import { getDb } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const db = getDb();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      try {
        const project = db.getProject(id);
        const stage = project?.stage ?? "completed";
        const progress = project?.progress_pct ?? 100;

        sendEvent("progress", {
          projectId: id,
          stage,
          progress,
          status: project?.status ?? "verified",
          telemetry: project?.telemetry_json,
        });

        // Close stream
        controller.close();
      } catch (err: unknown) {
        sendEvent("error", {
          error: err instanceof Error ? err.message : "Stream error",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
