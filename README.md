# 电商数据可视化大屏平台

一个前后端分离的电商数据可视化项目：后端 Node.js + Koa 提供 HTTP API 与 WebSocket 实时推送，前端 Vue + ECharts 6 渲染 6 大数据分析图表，支持主题动态切换与多客户端全屏状态同步。

> **二次开发说明**：本项目基于开源数据可视化大屏课程项目二次开发。在原项目基础上，我扩展了多客户端全屏状态同步（含断开重置逻辑）、完善主题切换机制，并对前后端代码做了结构调整与注释整理。

## 功能模块

大屏包含 6 个数据分析图表模块：

| 模块          | 说明                       |
| ----------- | ------------------------ |
| 销售趋势 Trend  | 全年销量 / 销售额双维度折线图         |
| 商家分布 Seller | 商家销量横向柱状图，支持滚动轮播         |
| 地区分布 Map    | 基于中国省 / 市 GeoJSON 的地图可视化 |
| 销售排行 Rank   | 柱状 + 折线组合图，展示 TOP 商家     |
| 热销商品 Hot    | 分类销量饼图与排行                |
| 库存销量 Stock  | 库存与分类占比图表                |

## 技术栈

**前端**

- Vue 2 + vue-router + vuex（路由与共享状态管理）
- axios（HTTP 请求封装）
- ECharts 6（CDN 引入，含自定义主题 `hjh.js`）
- Less（样式预处理）、`chartTheme` mixin（图表主题统一管理）

**后端**

- Node.js + Koa 3
- 中间件三层拆分：响应耗时统计（`koa_response_duration`）→ 响应头设置（`koa_response_header`）→ 数据路由（`koa_response_data`）
- ws 8：WebSocket 服务，负责数据实时推送与全屏状态同步

## 架构

```
┌──────────┐   HTTP /api (5555)   ┌─────────────────────┐
│  浏览器   │ ──────────────────▶ │  Koa 服务            │
│          │                      │  ├─ 耗时统计中间件    │
│ Vue 前端  │   WebSocket (8888)   │  ├─ 响应头中间件      │
│ ECharts  │ ◀─────────────────▶ │  └─ 数据路由中间件    │
│  大屏     │   实时推送 / 全屏同步  │        │             │
└──────────┘                      │   data/*.json 数据    │
                                  └─────────────────────┘
```

- **HTTP 通道**：首次加载时通过 axios 拉取各模块完整数据
- **WebSocket 通道**：连接建立后由服务端定时推送增量数据；任一客户端全屏切换时广播至所有连接端，客户端断开后自动重置状态并通知其余端

## 运行方式

```bash
# 1. 启动后端（HTTP 5555 / WebSocket 8888）
cd node_dataweb
npm install
node app.js

# 2. 启动前端
cd webproject_vue
npm install
npm run serve
```

启动后访问前端地址即可查看大屏。注意前端开发服务器端口请在 `webproject_vue/vue.config.js` 中配置为 **8888 以外的端口**（如 9999），避免与 WebSocket 服务端口冲突。

## 项目结构

```
ecom-data-platform
├── node_dataweb              # 后端服务
│   ├── app.js                # 入口：注册中间件、启动 HTTP 与 WebSocket
│   ├── moddleware/           # Koa 三层中间件
│   ├── service/webSocket.js  # WebSocket 服务与全屏状态同步
│   ├── utils/file_utils.js   # 数据文件读取工具
│   └── data/                 # 各模块 JSON 数据
└── webproject_vue            # 前端大屏
    ├── public/assets/        # ECharts 主题、中国省市 GeoJSON
    └── src/
        ├── components/       # 6 大图表组件（Trend/Seller/Map/Rank/Hot/Stock）
        ├── views/            # 页面路由视图（含大屏页 ScreenPage）
        ├── mixins/           # chartTheme 图表主题 mixin
        ├── utils/            # socket_service（WebSocket 单例）、map_utils、theme_utils
        ├── store/            # vuex 共享状态
        └── router/           # 路由配置
```

## 后续计划

- [ ] 数据层升级：JSON 文件 → MySQL + 定时任务，支持真实数据接入
- [ ] 部署上线：云服务器部署前后端，提供在线访问地址
- [ ] 前端升级：迁移至 Vue 3 + Vite
