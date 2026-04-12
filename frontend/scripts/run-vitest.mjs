import { spawn } from 'node:child_process'

const vitestArgs = process.argv.slice(2)
const localStoragePath = '.vitest-localstorage'
const existingNodeOptions = process.env.NODE_OPTIONS?.trim()
const localStorageOption = `--localstorage-file=${localStoragePath}`
const nodeOptions = existingNodeOptions
  ? `${existingNodeOptions} ${localStorageOption}`
  : localStorageOption

const child = spawn(
  process.execPath,
  ['./node_modules/vitest/vitest.mjs', ...vitestArgs],
  {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: nodeOptions,
    },
  }
)

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})

