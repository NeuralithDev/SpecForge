# SpecForge: Complete Enterprise User Guide & Feature Manual

SpecForge is an autonomous reverse-engineering engine that turns raw network captures (`.har`), JavaScript bundles, and live web flows into verified, strongly-typed API artifacts backed by mathematical evidence.

---

## 1. Feature Map & Interface Breakdown

### A. The Stat Overview Cards (Top of Dashboard)

| Card | What it Means | How to Interpret It |
|---|---|---|
| **Discovered Endpoints** | Authentic HTTP/GraphQL routes extracted from the capture | Only actual business API endpoints are shown (static CSS, JS, PNGs, and trackers are automatically filtered out). |
| **Evidence Ledger Records** | Cryptographic proof entries (SHA-256) | Every endpoint, parameter, and header is linked to exact byte offsets in the source capture file. Zero hallucination. |
| **Residual Unknowns** | Dynamic authentication tokens requiring operator input | When an endpoint requires an `Authorization: Bearer <token>`, `Cookie`, or `X-CSRF-Token` that changes per session, SpecForge flags it here instead of hardcoding stale secrets. |
| **Obligation Matrix Score** | Mathematical verification closure score | 100% means every discovered surface has been verified against an empirical observation. |

---

### B. The 5 Synthesized Deliverables (What They Are & How to Use Them)

When you click **Quick Exports** or open the **Synthesized Artifact Inspector**, SpecForge generates 5 production-ready files:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SpecForge Synthesis Output                      │
├──────────────────────────┬─────────────────────────────┬───────────────┤
│ Artifact                 │ Target Audience             │ Primary Use   │
├──────────────────────────┼─────────────────────────────┼───────────────┤
│ 1. mcp-server.ts         │ Claude Desktop / Cursor IDE │ AI Agent Tool │
│ 2. client.ts             │ Frontend / Backend Devs     │ TypeScript SDK│
│ 3. openapi.json (3.1.0)  │ API Gateways / Swagger / Docs│ API Spec Doc  │
│ 4. client.parity.test.ts │ QA / CI Test Suites (Vitest)│ Contract Test │
│ 5. CERTIFICATE.md        │ Compliance / CTO / Security │ Audit Ledger  │
└──────────────────────────┴─────────────────────────────┴───────────────┘
```

---

## 2. Step-by-Step Walkthrough: From Traffic Capture to Running Code

### Step 1: Record Clean Traffic (Chrome / Edge DevTools)

1. Open your browser and open **Developer Tools** (`F12` or `Cmd + Option + I`).
2. Switch to the **Network** tab.
3. Check the **Preserve log** checkbox.
4. Perform the actions on the target site (e.g. log in, search for a product, view account details).
5. Right-click any row in the Network list and select:
   **"Save all as HAR with content"**.

---

### Step 2: Upload to SpecForge

1. Navigate to **`http://localhost:3000`**.
2. Drag and drop your `.har` file into the **Upload & Capture Studio** (or click to browse).
3. SpecForge runs its 4-stage pipeline:
   - **Zero-Leak Redaction**: Live passwords, auth tokens, and session cookies are scrubbed.
   - **Dissection & Asset Filtering**: Static stylesheets, images, and telemetry are separated.
   - **Dynamic Token Detection**: Epistemic guardrail flags authentication requirements.
   - **Artifact Synthesis**: Generates the SDK, MCP server, tests, and OpenAPI spec.

---

### Step 3: Using the Generated `mcp-server.ts` (Model Context Protocol)

The MCP server allows AI assistants like **Claude Desktop** or **Cursor** to execute actions against the discovered API autonomously.

#### Running Standalone:
```bash
# 1. Install MCP SDK & dependencies
npm install @modelcontextprotocol/sdk zod

# 2. Set your environment variables (flagged in Residual Unknowns)
export SPECFORGE_AUTH_AUTHORIZATION="Bearer your_real_token_here"

# 3. Run the MCP server
npx tsx mcp-server.ts
```

#### Connecting to Claude Desktop:
Add this to your `claude_desktop_config.json` (located at `~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):
```json
{
  "mcpServers": {
    "my-extracted-api": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/downloaded/mcp-server.ts"],
      "env": {
        "SPECFORGE_AUTH_AUTHORIZATION": "Bearer your_token_here"
      }
    }
  }
}
```
Now, in Claude Desktop, you can say: *"Fetch customer profile and list current orders"* — Claude will call the tool directly!

---

### Step 4: Using the Generated `client.ts` (TypeScript SDK)

The generated client is a fully-typed, tree-shakeable TypeScript class.

```typescript
import { SpecForgeClient } from "./client.js";

// Initialize client with credentials
const client = new SpecForgeClient({
  baseUrl: "https://api.target.com",
  authTokens: {
    Authorization: process.env.MY_API_TOKEN!,
  },
});

// Call strongly typed endpoints with autocompletion
async function main() {
  const profile = await client.getV1CustomersProfile({ expand: "billing" });
  console.log("Status:", profile.status);
  console.log("Customer data:", profile.data);
}

main();
```

---

### Step 5: Running Contract Verification (`client.parity.test.ts`)

To prove that your synthesized client code adheres mathematically to the captured responses:

```bash
# Run the test suite with Vitest
npx vitest run client.parity.test.ts
```
What this tests:
- Asserts request path formatting and query serialization.
- Asserts response HTTP status codes match observed capture.
- Verifies that required dynamic tokens are passed in headers.

---

### Step 6: Importing `openapi.json` into API Clients / Swagger

1. Download or copy `openapi.json` from the Quick Export bar.
2. In **SpecForge Studio or standard API Clients**: Click **Import** > Drag & Drop `openapi.json` to automatically create a collection with all routes, query parameters, and example bodies.
3. In **Swagger Editor** (`editor.swagger.io`): Paste the JSON to view interactive API documentation and test endpoints with the "Try it out" feature.

---

## 3. Resolving Residual Unknowns (The Epistemic Guardrail)

When you see a card like:
> **Residual Unknowns**: `1 Dynamic Token`  
> *Flagged for operator env var injection*

This means the target API uses a dynamic session secret (like an OAuth Bearer token or CSRF token). SpecForge **refuses to hardcode secrets into the SDK** for security and freshness reasons.

To use the client or MCP server, simply inject the requested environment variable:
- `SPECFORGE_AUTH_AUTHORIZATION`
- `SPECFORGE_AUTH_X_CSRF_TOKEN`
- `SPECFORGE_AUTH_COOKIE`
