import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';

// Phase 1: every page is prerendered, so the incremental cache is read from Workers static assets
// (no R2 bucket needed). Phase 3 switches to the R2 cache when pages start revalidating (D-031).
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  // Serve prerendered pages from the cache without booting the Next.js server (saves CPU time).
  enableCacheInterception: true,
});
