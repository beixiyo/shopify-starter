import { execFileSync } from 'child_process'
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const dir = dirname(fileURLToPath(import.meta.url))
const envFile = readFileSync(resolve(dir, '../.env'), 'utf8')
const entries = envFile.split('\n')
  .filter(line => line.trim() && !line.startsWith('#'))
  .map(line => {
    const i = line.indexOf('=')
    return [line.slice(0, i).trim(), line.slice(i + 1).trim()]
  })

for (const [key, value] of entries) {
  console.log(`Setting ${key}...`)
  execFileSync('npx', ['wrangler', 'secret', 'put', key], {
    cwd: resolve(dir, '..'),
    input: value,
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: true,
  })
}
