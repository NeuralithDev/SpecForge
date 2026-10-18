import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@rea": path.resolve(__dirname, "../../src"),
      "@zip.js/zip.js": path.resolve(
        __dirname,
        "node_modules/@zip.js/zip.js/index.js",
      ),
      canonicalize: path.resolve(
        __dirname,
        "node_modules/canonicalize/lib/canonicalize.js",
      ),
      zod: path.resolve(__dirname, "node_modules/zod/index.js"),
      "@babel/parser": path.resolve(
        __dirname,
        "node_modules/@babel/parser/lib/index.js",
      ),
      "@babel/types": path.resolve(
        __dirname,
        "node_modules/@babel/types/lib/index.js",
      ),
      "lossless-json": path.resolve(
        __dirname,
        "node_modules/lossless-json/lib/esm/index.js",
      ),
    };
    config.resolve.modules = [
      path.resolve(__dirname, "node_modules"),
      "node_modules",
      ...(config.resolve.modules || []),
    ];
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };
    return config;
  },
};

export default nextConfig;
