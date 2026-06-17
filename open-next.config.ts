// OpenNext adapter configuration for deploying this Next.js app to
// Cloudflare Workers. See https://opennext.js.org/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig();

// `pnpm build` is wired to `opennextjs-cloudflare build`. By default OpenNext
// builds the Next.js app by re-running the package's `build` script, which
// here would call `opennextjs-cloudflare build` again and recurse infinitely.
// Point it straight at `next build` to break that cycle.
config.buildCommand = "next build";

export default config;
