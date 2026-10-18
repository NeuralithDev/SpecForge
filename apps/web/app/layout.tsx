import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpecForge Studio | Local-First API Client, .har Interceptor & MCP Compiler",
  description:
    "The local-first API client & MCP compiler for the AI era. Test HTTP requests offline, drag-and-drop .har traces, and compile into Claude MCP servers, TypeScript SDKs, OpenAPI 3.1 specs, and Vitest suites in 12s.",
  keywords: [
    "api-client",
    "har-analyzer",
    "mcp-server",
    "model-context-protocol",
    "openapi-3.1",
    "typescript-sdk",
    "offline-first",
    "local-scratchpad",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-[#0B0C0E] text-zinc-100 selection:bg-zinc-800 selection:text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
