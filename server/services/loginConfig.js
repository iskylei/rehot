const path = require('path')
const fs = require('fs')
const appStore = require('./appStore')

const SETTINGS_KEY = 'login_page'
const UPLOAD_DIR = path.join(__dirname, '../uploads/login')

const DEFAULT_CONFIG = {
  backgroundType: 'gradient',
  backgroundImage: '',
  backgroundGradient: 'linear-gradient(135deg, #922b21 0%, #641e16 100%)',
  overlayOpacity: 0.15
}

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  }
}

async function getRawSetting() {
  const row = await appStore.queryOne('SELECT value FROM app_settings WHERE `key` = ?', [SETTINGS_KEY])
  if (!row) return null
  try {
    return JSON.parse(row.value)
  } catch (error) {
    return null
  }
}

async function getLoginConfig() {
  const stored = await getRawSetting()
  return {
    ...DEFAULT_CONFIG,
    ...(stored || {})
  }
}

async function saveLoginConfig(config, operator = '') {
  const current = await getLoginConfig()
  const next = {
    ...current,
    ...config,
    updatedBy: operator,
    updatedAt: new Date().toISOString()
  }
  const now = appStore.currentTimestamp()
  const value = JSON.stringify(next)

  if (appStore.isMysqlApp()) {
    await appStore.execute(
      `INSERT INTO app_settings (\`key\`, value, updated_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)`,
      [SETTINGS_KEY, value, now]
    )
  } else {
    await appStore.execute(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
      [SETTINGS_KEY, value, now]
    )
  }

  return getLoginConfig()
}

async function setBackgroundImage(fileUrl, operator = '') {
  const current = await getLoginConfig()
  if (current.backgroundImage && current.backgroundImage !== fileUrl) {
    removeImageFile(current.backgroundImage)
  }

  return saveLoginConfig({
    backgroundType: 'image',
    backgroundImage: fileUrl
  }, operator)
}

function removeImageFile(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('/uploads/login/')) return
  const filename = path.basename(imageUrl)
  const filePath = path.join(UPLOAD_DIR, filename)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

async function clearBackgroundImage(operator = '') {
  const current = await getLoginConfig()
  removeImageFile(current.backgroundImage)
  return saveLoginConfig({
    backgroundImage: '',
    backgroundType: 'gradient'
  }, operator)
}

function toPublicConfig(config) {
  return {
    backgroundType: config.backgroundType,
    backgroundImage: config.backgroundImage || '',
    backgroundGradient: config.backgroundGradient,
    overlayOpacity: config.overlayOpacity
  }
}

ensureUploadDir()

module.exports = {
  UPLOAD_DIR,
  DEFAULT_CONFIG,
  getLoginConfig,
  saveLoginConfig,
  setBackgroundImage,
  clearBackgroundImage,
  toPublicConfig
}
