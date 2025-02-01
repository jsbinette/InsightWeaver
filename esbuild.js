const { build, context } = require('esbuild');
const path = require('path');
const fs = require('fs');

const isWatchMode = process.argv.includes('--watch');

const extensionConfig = {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    sourcemap: true,
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    outdir: 'out',
    tsconfig: 'tsconfig.json'
};

const webViewConfig = {
    entryPoints: [
        'src/webviews/image-webview.ts',
        'src/webviews/main-webview.ts',
        'src/webviews/sidebar-webview.ts',
        'src/webviews/tree-webview.ts',
    ],
    bundle: true,
    sourcemap: true,
    format: 'iife',
    platform: 'browser',
    outdir: 'out/webviews',
    tsconfig: 'tsconfig.json'
};

const utilitiesConfig = {
    entryPoints: ['src/utilities/chat-gpt-api.service.ts', 'src/utilities/context-menu-command.ts', 'src/utilities/utility.service.ts','src/utilities/tagsController.ts','src/utilities/instructionsController.ts', 'src/utilities/gitignore.ts'],
    bundle: true,
    sourcemap: true,
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    outdir: 'out/utilities',
    tsconfig: 'tsconfig.json'
};

const watchConfig = {
    watch: {
        onRebuild(error, result) {
            if (error) console.error('watch build failed:', error);
            else console.log('watch build succeeded:', result);
        },
    },
};

function copyStaticFiles() {
    const staticFiles = [
        { src: 'src/media/activity-bar-logo.svg', dest: 'out/media/activity-bar-logo.svg' },
        { src: 'src/media/chat-gpt-logo.jpeg', dest: 'out/media/chat-gpt-logo.jpeg' },
        { src: 'src/media/chat-instruciton-logo.png', dest: 'out/media/chat-instruciton-logo.png' },
        { src: 'src/media/chat-instruciton-logo@4x.png', dest: 'out/media/chat-instruciton-logo@4x.png' },
        { src: 'src/media/vscode.css', dest: 'out/media/vscode.css' },
    ];

    staticFiles.forEach(file => {
        const destDir = path.dirname(file.dest);
        fs.mkdirSync(destDir, { recursive: true }); // Ensure the destination directory exists
        fs.copyFileSync(file.src, file.dest);
        console.log(`Copied ${file.src} to ${file.dest}`);
    });
}

(async () => {
    try {
        if (isWatchMode) {
            await build({
                ...extensionConfig,
                ...webViewConfig,
                ...utilitiesConfig,
                ...watchConfig,
            });
            console.log("[watch] build finished");
        } else {
            await build(extensionConfig);
            await build(webViewConfig);
            await build(utilitiesConfig);
            copyStaticFiles(); // Copy static files after building
            console.log("build complete");
        }
    } catch (err) {
        process.stderr.write(err.stderr);
        process.exit(1);
    }
})();