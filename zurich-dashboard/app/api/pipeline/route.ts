import { NextRequest } from "next/server";
import { runOrchestrator } from "@/lib/orchestrator";
import { PipelineEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { googleApiKey } = await req.json();

  if (!googleApiKey) {
    return new Response(JSON.stringify({ error: "Missing googleApiKey" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not set in environment" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: PipelineEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      try {
        send({ type: "status", message: "Pipeline started. Claude is coordinating the search…" });

        const total = await runOrchestrator(
          googleApiKey,
          (msg) => send({ type: "status", message: msg }),
          (business) => send({ type: "business", data: business })
        );

        send({ type: "done", total });
      } catch (err) {
        send({ type: "error", message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
