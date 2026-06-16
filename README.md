# REHOT · 热浪管理程序

热浪监测与管理全栈应用，前端使用 Vue 2 + Element UI，后端使用 Express + SQLite 数据库。

## 功能

- 热浪事件登记与维护（地区、城市、最高温度、预警等级、起止日期等）
- 数据概览统计（活跃热浪、预警分布、近期事件）
- 用户登录与后台管理

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 2、Vue Router、Element UI、Axios |
| 后端 | Node.js、Express |
| 数据库 | SQLite（better-sqlite3） |

## 快速开始

```bash
# 安装依赖
npm install

# 同时启动后端 API（3003）与前端开发服务（9090）
npm run dev
```

- 前端：http://localhost:9090
- 后端 API：http://localhost:3000/api
- 默认账号：`admin` / `admin123`

## 单独启动

```bash
npm run server   # 仅后端
npm run serve    # 仅前端
```

## 生产部署

```bash
npm run build
NODE_ENV=production npm run server
```

构建产物 `dist/` 将由后端在同一端口提供静态资源服务。

## 项目结构

```
REHOT/
├── public/          # 静态资源
├── server/          # Express 后端
│   ├── data/        # SQLite 数据库文件
│   ├── middleware/  # 认证中间件
│   └── routes/      # API 路由
└── src/             # Vue 前端源码
    ├── api/         # 接口封装
    ├── router/      # 路由配置
    └── views/       # 页面组件
```
