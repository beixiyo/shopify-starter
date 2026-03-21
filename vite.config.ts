import { fileURLToPath, URL } from 'node:url'
import { autoParseStyles } from '@jl-org/js-to-style'
import { reactRouter } from '@react-router/dev/vite'
import { hydrogen } from '@shopify/hydrogen/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

/**
 * EXPRESS_MODE=1 时构建 Express 自部署产物：
 * - 去掉 oxygen() 插件
 * - 别名 react-dom/server → browser 版本（React Router 内部需要 renderToReadableStream）
 * - 替换 entry.server → entry.server.express（renderToPipeableStream，避免 abort 竞态）
 * - ssr.noExternal 避免 React 双实例
 *
 * entry.server.express.tsx 从 react-dom/server.node 导入 renderToPipeableStream，
 * 不受 react-dom/server alias 影响
 */
const useExpressMode = process.env.EXPRESS_MODE === '1'

export default defineConfig({
  resolve: {
    alias: useExpressMode
      ? [{ find: /^react-dom\/server$/, replacement: 'react-dom/server.browser' }]
      : [],
  },
  plugins: [
    tailwindcss(),
    hydrogen(),
    ...(
      useExpressMode
        ? []
        : [(await import('@shopify/mini-oxygen/vite')).oxygen()]
    ),
    // Express 模式：将 entry.server.tsx 替换为 entry.server.express.tsx
    ...(useExpressMode
      ? [{
          name: 'express-entry-server',
          enforce: 'pre' as const,
          resolveId(source: string) {
            if (/entry\.server\.tsx?$/.test(source) && !source.includes('express')) {
              return fileURLToPath(new URL('./app/entry.server.express.tsx', import.meta.url))
            }
          },
        }]
      : []),
    reactRouter(),
    tsconfigPaths(),
    autoParseStyles({
      jsPath: fileURLToPath(new URL('./app/styles/variable.ts', import.meta.url)),
      cssPath: fileURLToPath(new URL('./app/styles/css/autoVariables.css', import.meta.url)),
    }),
  ],
  build: {
    assetsInlineLimit: 0,
  },
  ssr: useExpressMode
    ? {
        noExternal: [
          /^react/,
          /^react-dom/,
          /^react-router/,
          /^@react-router/,
          /^@shopify\/hydrogen/,
        ],
      }
    : {
        optimizeDeps: {
        /**
         * Include dependencies here if they throw CJS<>ESM errors.
         * @see https://vitejs.dev/config/dep-optimization-options
         */
          include: ['set-cookie-parser', 'cookie', 'react-router'],
        },
      },
  server: {
    allowedHosts: ['.tryhydrogen.dev'],
    host: '::',
  },
})
