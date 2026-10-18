import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { MAX_PAYLOAD_BYTE_LIMIT } from "@rea/engine/SpecForgePipeline";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      fileName?: string;
      fileSize?: number;
      contentType?: string;
      orgId?: string;
    };

    const fileName = body.fileName ?? "capture.har";
    const fileSize = body.fileSize ?? 0;
    const orgId = body.orgId ?? "00000000-0000-0000-0000-000000000000";

    // 1. Enforce payload budget (50 MiB)
    if (fileSize > MAX_PAYLOAD_BYTE_LIMIT) {
      return NextResponse.json(
        {
          error: `Payload size (${fileSize} bytes) exceeds maximum allowable limit of ${MAX_PAYLOAD_BYTE_LIMIT} bytes (50 MiB).`,
        },
        { status: 413 },
      );
    }

    // 2. Validate file extension
    const lowerName = fileName.toLowerCase();
    const isAllowed =
      lowerName.endsWith(".har") ||
      lowerName.endsWith(".json") ||
      lowerName.endsWith(".js") ||
      lowerName.endsWith(".txt");

    if (!isAllowed) {
      return NextResponse.json(
        {
          error: `Disallowed file extension. SpecForge accepts .har, .json, and .js bundle files only.`,
        },
        { status: 400 },
      );
    }

    const fileId = randomUUID();
    const storagePath = `${orgId}/${fileId}-${fileName.replace(/[^a-zA-Z0-9._-]/gu, "_")}`;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let uploadUrl = `/api/uploads/direct?path=${encodeURIComponent(storagePath)}`;

    if (supabaseUrl && supabaseKey) {
      // In production Supabase environment, generate signed upload endpoint
      uploadUrl = `${supabaseUrl}/storage/v1/object/upload/sign/capture_uploads/${storagePath}`;
    }

    return NextResponse.json({
      success: true,
      fileKey: fileId,
      storagePath,
      bucket: "capture_uploads",
      uploadUrl,
      maxSizeBytes: MAX_PAYLOAD_BYTE_LIMIT,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Presign failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
