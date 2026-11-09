import { getViteConfig } from 'astro/config';
import { createServer } from 'vite';

export async function createAstroServer(root = process.cwd()) {
  process.env.ASTRO_TELEMETRY_DISABLED = '1';
  // EmDash deliberately prefers diagnostics over fallback in development.
  const config = await getViteConfig({
    root,
    server: { middlewareMode: true },
    plugins: [{
      name: 'empty-portable-text-plugin-registry',
      resolveId(id) { if (id === 'virtual:emdash/block-components' || id === 'virtual:emdash/config') return '\0' + id; },
      load(id) { if (id === '\0virtual:emdash/config') return 'export default {};'; if (id === '\0virtual:emdash/block-components') return 'export const pluginBlockComponents = {};'; },
    }],
    define: { 'import.meta.env.DEV': false },
  }, { root, devToolbar: { enabled: false } })({ mode: 'test', command: 'serve' });
  config.server ??= {};
  // Several block tests each start a server. Vite still opens its websocket
  // unless this is set, and the second server then fails on port 24678.
  config.server.ws = false;
  return createServer(config);
}
