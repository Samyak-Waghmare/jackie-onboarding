import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 no longer lints during `next build`, so deploys won't trip on
  // lint warnings. Type errors still fail the build by design.
};

export default nextConfig;
