import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue2';
import fs from 'fs';

// Custom plugin to load .wasm files as base64 strings (replaces base64-loader)
function wasmBase64Plugin() {
  return {
    name: 'wasm-base64',
    load(id: string) {
      if (id.endsWith('.wasm')) {
        const buffer = fs.readFileSync(id);
        return `export default "${buffer.toString('base64')}"`;
      }
    },
  };
}

// Custom plugin to load .svg files as Vue 2 components (replaces vue-svg-loader)
function svgVue2Plugin() {
  return {
    name: 'svg-vue2-component',
    transform(code: string, id: string) {
      if (id.endsWith('.svg')) {
        const svg = fs.readFileSync(id, 'utf-8');
        // Escape backticks and backslashes in SVG content
        const escaped = svg.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
        return {
          code: `export default { functional: true, render(h, context) { return h('span', { ...context.data, domProps: { innerHTML: \`${escaped}\` } }) } }`,
          map: null,
        };
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [vue(), wasmBase64Plugin(), svgVue2Plugin()],
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
    minify: mode === 'production',
    emptyOutDir: false,
    rollupOptions: {
      input: getEntry(mode),
      onwarn(warning, warn) {
        // Suppress known harmless warnings
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        if (warning.message?.includes('has been externalized for browser compatibility')) return;
        if (warning.message?.includes('Use of eval')) return;
        warn(warning);
      },
      output: {
        entryFileNames: '[name].js',
        // Self-contained bundles for browser extension
        inlineDynamicImports: true,
        // Put any referenced assets directly in dist/
        assetFileNames: '[name][extname]',
      },
    },
  },
  resolve: {
    alias: mode === 'test' ? {
      util: 'util',
      buffer: 'buffer',
      stream: 'stream-browserify',
    } : {},
    extensions: ['.mjs', '.js', '.jsx', '.vue', '.json', '.wasm', '.ts', '.tsx'],
  },
  define: mode === 'test' ? {
    'process.env': '{}',
    'process.browser': 'true',
    global: 'globalThis',
  } : {},
  assetsInclude: ['**/*.wasm'],
}));

function getEntry(mode: string) {
  // VITE_ENTRY env var allows building one entry at a time for self-contained bundles
  const entry = process.env.VITE_ENTRY;
  if (entry) {
    return { [entry]: `src/${entry}.ts` };
  }
  // Fallback: only used for watch mode or single entry
  return { popup: 'src/popup.ts' };
}
