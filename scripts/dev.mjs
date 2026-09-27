import { spawn } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function canListen(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.unref()
    server.once('error', (error) => {
      resolve(error.code !== 'EADDRINUSE')
    })
    server.listen({ port, host }, () => {
      server.close(() => resolve(true))
    })
  })
}

async function freePort(port) {
  const addresses = ['::', '0.0.0.0', '127.0.0.1', '::1']
  for (const host of addresses) {
    if (!(await canListen(port, host))) return freePort(port + 1)
  }
  return port
}

const apiPort = await freePort(Number(process.env.PORT || 8787))
const webPort = await freePort(Number(process.env.WEB_PORT || 5173))
const tsx = path.join(root, 'apps/api/node_modules/tsx/dist/cli.mjs')
const vite = path.join(root, 'apps/web/node_modules/vite/bin/vite.js')

if (!fs.existsSync(tsx) || !fs.existsSync(vite)) {
  console.error('Dependencies are missing. From the repo root, run: npx pnpm@10.15.0 install')
  process.exit(1)
}

console.log('')
console.log('ImpactMesh')
console.log(`  app  http://localhost:${webPort}`)
console.log(`  api  http://localhost:${apiPort}`)
console.log('')

const sharedEnv = {
  ...process.env,
  PORT: String(apiPort),
  WEB_PORT: String(webPort),
  API_PROXY: `http://127.0.0.1:${apiPort}`,
  FRONTEND_URL: `http://localhost:${webPort}`,
  API_URL: `http://localhost:${apiPort}`,
}

const api = spawn(process.execPath, [tsx, 'watch', 'src/server.ts'], {
  cwd: path.join(root, 'apps/api'),
  env: sharedEnv,
  stdio: 'inherit',
})

const web = spawn(process.execPath, [vite], {
  cwd: path.join(root, 'apps/web'),
  env: sharedEnv,
  stdio: 'inherit',
})

function stop() {
  api.kill()
  web.kill()
}

process.on('SIGINT', () => {
  stop()
  process.exit(0)
})
process.on('SIGTERM', () => {
  stop()
  process.exit(0)
})

api.on('exit', (code) => {
  if (code && code !== 0) {
    web.kill()
    process.exit(code)
  }
})
web.on('exit', (code) => {
  if (code && code !== 0) {
    api.kill()
    process.exit(code)
  }
})
