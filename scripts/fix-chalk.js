const fs = require('fs')
const path = require('path')

const projectRoot = path.join(__dirname, '..')
const nodeModulesRoot = path.join(projectRoot, 'node_modules')

function walkChalkDirs(dir, results = [], depth = 0) {
  if (depth > 8 || !fs.existsSync(dir)) {
    return results
  }

  for (const name of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, name)
    let stat

    try {
      stat = fs.statSync(fullPath)
    } catch (error) {
      continue
    }

    if (!stat.isDirectory()) {
      continue
    }

    if (name === 'chalk' && fs.existsSync(path.join(fullPath, 'package.json'))) {
      results.push(fullPath)
      continue
    }

    if (name === 'node_modules' || name.startsWith('@')) {
      walkChalkDirs(fullPath, results, depth + 1)
    }
  }

  return results
}

function patchChalkPackage(chalkDir) {
  const packageJsonPath = path.join(chalkDir, 'package.json')
  const entryPath = path.join(chalkDir, 'source', 'index.js')
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

  if (!fs.existsSync(entryPath)) {
    throw new Error(
      `chalk 安装不完整，缺少 ${path.relative(projectRoot, entryPath)}。` +
      '请删除 node_modules 后重新执行 npm install。'
    )
  }

  if (pkg.main === 'source' || pkg.main === './source') {
    pkg.main = 'source/index.js'
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`)
    console.log(`[fix-chalk] 已修复 ${path.relative(projectRoot, chalkDir)}`)
    return true
  }

  if (pkg.main !== 'source/index.js') {
    console.warn(`[fix-chalk] 跳过未知 chalk 版本: ${path.relative(projectRoot, chalkDir)} (${pkg.version || 'unknown'})`)
  }

  return false
}

function main() {
  if (!fs.existsSync(nodeModulesRoot)) {
    console.log('[fix-chalk] 未找到 node_modules，跳过')
    return
  }

  const chalkDirs = walkChalkDirs(nodeModulesRoot)
  if (!chalkDirs.length) {
    console.log('[fix-chalk] 未找到 chalk 依赖，跳过')
    return
  }

  let fixed = 0
  for (const chalkDir of chalkDirs) {
    if (patchChalkPackage(chalkDir)) {
      fixed += 1
    }
  }

  console.log(`[fix-chalk] 检查完成，修复 ${fixed} 处`)
}

try {
  main()
} catch (error) {
  console.error(`[fix-chalk] ${error.message}`)
  process.exit(1)
}
