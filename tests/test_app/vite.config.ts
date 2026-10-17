import { rmSync, writeFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

const devServerUrl = 'http://localhost:5173';

// The hot file plugin of the pieceofcake2/vite documentation, removed in Storybook by the
// framework (excludeVitePlugins)
const hotFile = (path: string, url: string): Plugin => ({
    name: 'hot-file',
    apply: 'serve',
    configureServer(server) {
        const clean = () => rmSync(path, { force: true });
        server.httpServer?.once('listening', () => writeFileSync(path, url));
        process.once('exit', clean);
    },
});

export default defineConfig({
    base: '/build/',
    publicDir: false,
    plugins: [hotFile('webroot/hot', devServerUrl)],
    build: {
        outDir: 'webroot/build',
        emptyOutDir: true,
        manifest: 'manifest.json',
        rolldownOptions: {
            input: 'assets/app.ts',
        },
    },
    server: {
        port: 5173,
        strictPort: true,
        cors: true,
        origin: devServerUrl,
    },
});
