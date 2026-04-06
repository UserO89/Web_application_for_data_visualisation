import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const frontendDir = resolve(scriptDir, '../..')
const viteBin = join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js')

const frontendServer = spawn(
  process.execPath,
  [viteBin, '--host', '127.0.0.1', '--port', '4173'],
  {
    cwd: frontendDir,
    env: {
      ...process.env,
      VITE_API_BASE_URL: '/api/v1',
      VITE_BACKEND_URL: 'http://127.0.0.1:8001',
    },
    stdio: 'inherit',
  }
)

forwardTerminationSignals(frontendServer)

frontendServer.on('exit', (code) => {
  process.exit(code ?? 0)
})

function forwardTerminationSignals(child) {
  const terminate = (signal) => {
    if (!child.killed) {
      child.kill(signal)
    }
  }

  process.on('SIGINT', () => terminate('SIGINT'))
  process.on('SIGTERM', () => terminate('SIGTERM'))
  process.on('exit', () => terminate('SIGTERM'))
}
