import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const envFile = readFileSync(resolve(dir, '../.env'), 'utf8')
const entries = envFile.split('\n')
  .filter(line => line.trim() && !line.startsWith('#'))
  .map((line) => {
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
