import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Zero-config Cloudflare Workers deployment.
// No external KV/R2/D1 bindings needed for this app since all state
// is managed client-side (localStorage). OpenNext defaults apply.
export default defineCloudflareConfig();

