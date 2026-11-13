import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skapar .next/standalone: en minimal server med bara de filer som behövs.
  // Gör Docker-imagen liten (se Dockerfile).
  output: "standalone",

  // Projektmappen är roten för filspårning och bygge. Utan detta kan Next välja fel rot
  // om det ligger en annan package-lock.json högre upp i mappträdet.
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },

  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
