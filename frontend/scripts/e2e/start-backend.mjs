import { randomBytes } from 'node:crypto'
import { existsSync, closeSync, mkdirSync, openSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync, spawn, spawnSync } from 'node:child_process'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '../../..')
const backendDir = join(repoRoot, 'backend')
const databasePath = join(backendDir, 'database', 'e2e.sqlite')
const phpBinary = resolvePhpBinary()
const phpProcessOptions = buildPhpProcessOptions(phpBinary)

ensureSqliteDatabase(databasePath)

const backendEnv = {
  ...process.env,
  APP_ENV: 'e2e',
  APP_DEBUG: 'true',
  APP_KEY: `base64:${randomBytes(32).toString('base64')}`,
  APP_URL: 'http://127.0.0.1:8001',
  FRONTEND_URL: 'http://127.0.0.1:4173',
  CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:4173,http://localhost:4173',
  CORS_ALLOWED_ORIGIN_PATTERNS: '',
  CORS_SUPPORTS_CREDENTIALS: 'true',
  SANCTUM_STATEFUL_DOMAINS: '127.0.0.1:4173,localhost:4173,127.0.0.1:8001,localhost:8001',
  DB_CONNECTION: 'sqlite',
  DB_DATABASE: databasePath,
  SESSION_DRIVER: 'cookie',
  CACHE_STORE: 'file',
  QUEUE_CONNECTION: 'sync',
  FILESYSTEM_DISK: 'local',
  MAIL_MAILER: 'array',
  DEMO_PROJECT_ID: '',
  BCRYPT_ROUNDS: '4',
}

runArtisan(['optimize:clear'], backendEnv)
runArtisan(['migrate:fresh', '--force'], backendEnv)

const backendServer = spawn(
  phpBinary,
  ['artisan', 'serve', '--host=127.0.0.1', '--port=8001', '--no-reload'],
  {
    cwd: backendDir,
    env: backendEnv,
    shell: phpProcessOptions.shell,
    stdio: 'inherit',
  }
)

forwardTerminationSignals(backendServer)

backendServer.on('exit', (code) => {
  process.exit(code ?? 0)
})

function ensureSqliteDatabase(pathname) {
  mkdirSync(dirname(pathname), { recursive: true })
  if (!existsSync(pathname)) {
    closeSync(openSync(pathname, 'w'))
  }
}

function resolvePhpBinary() {
  const explicitCandidates = [
    process.env.DATAVIZ_PHP_BIN,
    process.env.PHP_BIN,
    process.env.PHP,
  ].filter(Boolean)

  for (const candidate of explicitCandidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  const commandName = process.platform === 'win32' ? 'where' : 'which'
  const lookupTargets = process.platform === 'win32' ? ['php.exe', 'php'] : ['php']

  for (const lookupTarget of lookupTargets) {
    const lookup = spawnSync(commandName, [lookupTarget], { encoding: 'utf8' })
    if (lookup.status === 0) {
      const firstPath = lookup.stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean)

      if (firstPath) {
        return firstPath
      }
    }
  }

  throw new Error(
    '[e2e] Unable to resolve PHP executable. Set DATAVIZ_PHP_BIN to your php.exe path before running system tests.'
  )
}

function runArtisan(args, env) {
  execFileSync(phpBinary, ['artisan', ...args], {
    cwd: backendDir,
    env,
    shell: phpProcessOptions.shell,
    stdio: 'inherit',
  })
}

function buildPhpProcessOptions(binaryPath) {
  const extension = extname(binaryPath).toLowerCase()

  return {
    shell: process.platform === 'win32' && ['.bat', '.cmd'].includes(extension),
  }
}

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
