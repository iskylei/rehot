const { execSync } = require('child_process')
const path = require('path')

const PROJECT_DIR = path.resolve(__dirname, '..')
const PORTS = [3003, 3001, 9090, 3000]

function getListenPids(port) {
  try {
    const output = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN 2>/dev/null`, { encoding: 'utf8' })
    return output.trim().split('\n').filter(Boolean)
  } catch (error) {
    return []
  }
}

function getProcessCwd(pid) {
  try {
    const output = execSync(`lsof -a -p ${pid} -d cwd 2>/dev/null | tail -1`, { encoding: 'utf8' })
    return output.trim().split(/\s+/).pop() || ''
  } catch (error) {
    return ''
  }
}

PORTS.forEach(port => {
  getListenPids(port).forEach(pid => {
    const cwd = getProcessCwd(pid)
    if (!cwd.includes('REHOT')) return
    try {
      process.kill(Number(pid), 'SIGKILL')
      console.log(`[free-ports] killed PID ${pid} on port ${port}`)
    } catch (error) {
      console.warn(`[free-ports] unable to kill PID ${pid}: ${error.message}`)
    }
  })
})
