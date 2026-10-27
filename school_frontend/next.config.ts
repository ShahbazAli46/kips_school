import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Directory-style URLs let Apache serve exported routes on shared hosting.
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }),
  }
};

export default nextConfig;

