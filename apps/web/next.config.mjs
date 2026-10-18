/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    externalDir: true,
    serverComponentsExternalPackages: [
      "@babel/parser",
      "@babel/types",
      "@zip.js/zip.js",
      "canonicalize",
      "lossless-json",
      "zod",
    ],
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };
    return config;
  },
};

export default nextConfig;
