import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }),
  }
};

export default nextConfig;

