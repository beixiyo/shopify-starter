import type { Config } from '@react-router/dev/config'
import { hydrogenPreset } from '@shopify/hydrogen/react-router-preset'

/**
 * EXPRESS_MODE=1 时跳过 hydrogenPreset()，输出标准 React Router ServerBuild
 * 用于 `pnpm build:express` → `server.express.mjs`
 */
const useExpressMode = process.env.EXPRESS_MODE === '1'

export default {
  ...(useExpressMode ? {} : { presets: [hydrogenPreset()] }),
  ssr: true,
} satisfies Config
