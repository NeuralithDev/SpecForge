import { NextRequest, NextResponse } from "next/server";
import { TextReader, Uint8ArrayWriter, ZipWriter } from "@zip.js/zip.js";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      files?: Record<string, string>;
      zipName?: string;
    };

    const files = body.files ?? {};
    const zipName = body.zipName ?? "specforge-mcp-sdk-bundle.zip";

    const zipWriter = new ZipWriter(new Uint8ArrayWriter());

    for (const [relativePath, content] of Object.entries(files)) {
      if (typeof content === "string") {
        await zipWriter.add(relativePath, new TextReader(content));
      }
    }

    const zipBytes = await zipWriter.close();

    return new NextResponse(Buffer.from(zipBytes), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
