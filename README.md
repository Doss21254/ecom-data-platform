# 电商数据可视化大屏平台

一个前后端分离的电商数据可视化项目：后端 Node.js + Koa 提供 HTTP API 与 WebSocket 实时推送，数据层基于 MySQL（mysql2 连接池），前端 Vue + ECharts 6 渲染 6 大数据分析图表，支持主题动态切换与多客户端全屏状态同步。

> **在线访问**：http://119.29.139.137 （部署于腾讯云轻量服务器，Nginx + pm2）

> **二次开发说明**：本项目基于开源数据可视化大屏课程项目二次开发。在原项目基础上，我主要做了三件事：
>
> 1. **数据层重构**：静态 JSON 文件 → MySQL 8 张表（含 mysql2 连接池、seed 脚本、逐表 COUNT 对账），服务层返回结构与原接口完全一致，前端零改动实现平滑切换
> 2. **多客户端全屏状态同步**：任一端全屏切换广播至所有连接端，断开自动重置
> 3. **性能优化**：用 EXPLAIN 定位并验证索引优化（见下文「性能优化」）

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
- **MySQL 8 + mysql2 连接池**（`service/data_service.js` 数据服务层，`utils/db.js` 连接池），dotenv 管理数据库凭证

## 架构

```
┌──────────┐   HTTP /api (5555)   ┌─────────────────────┐
│  浏览器   │ ──────────────────▶ │  Koa 服务            │
│          │                      │  ├─ 耗时统计中间件    │
│ Vue 前端  │   WebSocket (8888)   │  ├─ 响应头中间件      │
│ ECharts  │ ◀─────────────────▶ │  └─ 数据路由中间件    │
│  大屏     │   实时推送 / 全屏同步  │        │             │
└──────────┘                      │  data_service 服务层  │
                                  │  （mysql2 连接池）    │
                                  └──────────┬──────────┘
                                             │
                                    MySQL 8 张表 ecom_screen
```

- **HTTP 通道**：首次加载时通过 axios 拉取各模块完整数据
- **WebSocket 通道**：连接建立后由服务端定时推送增量数据；任一客户端全屏切换时广播至所有连接端，客户端断开后自动重置状态并通知其余端
- **数据服务层约定**：`data_service.js` 每个函数返回的 JSON 结构与改造前完全一致，Koa 路由与 WebSocket 推送逻辑无需感知数据来源变化

## 性能优化：EXPLAIN 索引实验

在 `map_point` 表扩容至 10 万行后做的对照实验（每个场景各测 3 次）：

| 场景 | 无索引（Table scan） | 有索引（Index lookup） | 结论 |
|---|---|---|---|
| 高选择性（命中 0.5%） | ~55 ms | **~3 ms** | **约 20 倍提升** |
| 低选择性（命中 1/3） | ~60 ms | 41-70 ms | 索引收益趋零 |

第二个结果比第一个更有意思：当查询命中大量数据时，索引定位后仍需逐行回表（随机读），与顺序全表扫描耗时接近甚至更慢——**索引的价值取决于选择性，建索引前要看查询的实际命中比例**。

## 运行方式

**前置要求**：Node.js 16+、本地 MySQL 8（确保服务已启动）。

```bash
# 1. 初始化数据库（在 MySQL 中执行建表，共 8 张表）
#    表结构见下方「数据表设计」

# 2. 配置数据库连接
cd node_dataweb
cp .env.example .env   # 或直接新建 .env
# 编辑 .env 填入你的数据库密码：
# DB_PWD=你的密码

# 3. 安装依赖并导入数据
npm install
node seed.js            # 可重复执行，导入后逐表 COUNT 对账

# 4. 启动后端（HTTP 5555 / WebSocket 8888）
node app.js

# 5. 启动前端
cd ../webproject_vue
npm install
npm run serve
```

启动后访问前端地址即可查看大屏。注意前端开发服务器端口请在 `webproject_vue/vue.config.js` 中配置为 **8888 以外的端口**（如 9999），避免与 WebSocket 服务端口冲突。

## 数据表设计

8 张表支撑 6 大数据模块，按数据形态分别建模：

| 表 | 说明 |
|---|---|
| `seller` | 商家销量（扁平） |
| `province_sales` | 销售排行（省级） |
| `map_point` | 商家分布散点（分组 + 城市经纬度） |
| `stock` | 库存与销量（扁平） |
| `hot_goods` | 热销商品三级树（大类→分类→商品，parent_id 自关联） |
| `trend_config` / `trend_series` / `trend_month` | 趋势数据拆三表：配置 / 数据线（一行一个数据点的长表设计）/ 月份标签字典 |

## 项目结构

```
ecom-data-platform
├── node_dataweb              # 后端服务
│   ├── app.js                # 入口：注册中间件、启动 HTTP 与 WebSocket
│   ├── moddleware/           # Koa 三层中间件
│   ├── service/webSocket.js  # WebSocket 服务与全屏状态同步
│   ├── service/data_service.js # 数据服务层：6 大模块的 MySQL 查询与结构组装
│   ├── utils/db.js           # mysql2 连接池（dotenv 读取凭证）
│   ├── utils/file_utils.js   # 数据读取工具
│   └── seed.js               # 数据导入脚本（可重复执行）
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

- [x] 数据层升级：JSON 文件 → MySQL（mysql2 连接池 + seed 脚本，已完成）
- [ ] 定时任务：真实数据源接入与定时更新
- [x] 部署上线：腾讯云轻量服务器（Nginx 反向代理 /api 与 /ws + pm2 进程守护 + 2G swap），提供在线访问地址 http://119.29.139.137
- [ ] 前端升级：迁移至 Vue 3 + Vite
