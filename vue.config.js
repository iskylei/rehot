const { defineConfig } = require('@vue/cli-service')

const API_PORT = process.env.API_PORT || process.env.PORT || 3003

module.exports = defineConfig({
  configureWebpack: {
    resolve: {
      alias: {
        '@': require('path').resolve(__dirname, 'src')
      }
    }
  },
  devServer: {
    port: 9090,
    open: true,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true
      },
      '/uploads': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true
      }
    }
  }
})
