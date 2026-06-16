const path = require('path')
const fs = require('fs')

function loadEnv() {
  try {
    const dotenv = require('dotenv')
    const envPath = path.join(__dirname, '../../.env')
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath })
    } else {
      dotenv.config()
    }
  } catch (error) {
    // dotenv 未安装时忽略，使用系统环境变量
  }
}

loadEnv()

module.exports = { loadEnv }
