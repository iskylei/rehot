const express = require('express')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const { authRequired, permissionRequired } = require('../middleware/auth')
const {
  UPLOAD_DIR,
  DEFAULT_CONFIG,
  getLoginConfig,
  saveLoginConfig,
  setBackgroundImage,
  clearBackgroundImage,
  toPublicConfig
} = require('../services/loginConfig')

const router = express.Router()

const storage = multer.diskStorage({
  destination(req, file, cb) {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    }
    cb(null, UPLOAD_DIR)
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase()
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg'
    cb(null, `login-bg-${Date.now()}${safeExt}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
      return
    }
    cb(new Error('仅支持 JPG、PNG、WEBP、GIF 图片'))
  }
})

router.get('/', async (req, res) => {
  try {
    const config = await getLoginConfig()
    res.json({ config: toPublicConfig(config) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.get('/admin', authRequired, permissionRequired('system:login:view'), async (req, res) => {
  try {
    res.json({ config: await getLoginConfig() })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.put('/', authRequired, permissionRequired('system:login:manage'), async (req, res) => {
  try {
    const {
      backgroundType,
      backgroundGradient,
      overlayOpacity
    } = req.body || {}

    const next = {}
    if (backgroundType) {
      if (!['gradient', 'image'].includes(backgroundType)) {
        return res.status(400).json({ message: '背景类型无效' })
      }
      next.backgroundType = backgroundType
    }

    if (backgroundGradient !== undefined) {
      next.backgroundGradient = String(backgroundGradient).trim()
    }

    if (overlayOpacity !== undefined) {
      const opacity = Number(overlayOpacity)
      if (Number.isNaN(opacity) || opacity < 0 || opacity > 0.8) {
        return res.status(400).json({ message: '遮罩透明度需在 0 ~ 0.8 之间' })
      }
      next.overlayOpacity = opacity
    }

    const config = await saveLoginConfig(next, req.user?.username || '')
    res.json({ config: toPublicConfig(config) })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/upload', authRequired, permissionRequired('system:login:manage'), (req, res) => {
  upload.single('file')(req, res, async err => {
    try {
      if (err) {
        return res.status(400).json({ message: err.message || '上传失败' })
      }

      if (!req.file) {
        return res.status(400).json({ message: '请选择图片文件' })
      }

      const fileUrl = `/uploads/login/${req.file.filename}`
      const config = await setBackgroundImage(fileUrl, req.user?.username || '')
      res.json({
        config: toPublicConfig(config),
        message: '背景图上传成功'
      })
    } catch (error) {
      res.status(500).json({ message: error.message })
    }
  })
})

router.delete('/background-image', authRequired, permissionRequired('system:login:manage'), async (req, res) => {
  try {
    const config = await clearBackgroundImage(req.user?.username || '')
    res.json({ config: toPublicConfig(config), message: '已恢复默认背景' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/reset', authRequired, permissionRequired('system:login:manage'), async (req, res) => {
  try {
    await clearBackgroundImage(req.user?.username || '')
    const config = await saveLoginConfig({ ...DEFAULT_CONFIG }, req.user?.username || '')
    res.json({ config: toPublicConfig(config), message: '已重置为默认配置' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
