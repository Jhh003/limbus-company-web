# 今天蛋筒什么 - Limbus Company 随机选择器

## 技术文档

> **版本**: 1.6.0  
> **最后更新**: 2025-02-08  
> **部署环境**: Cloudflare Pages + Workers  

---

## 目录

1. [项目背景与目标](#1-项目背景与目标)
2. [技术栈与依赖说明](#2-技术栈与依赖说明)
3. [目录结构与核心模块解析](#3-目录结构与核心模块解析)
4. [关键功能实现逻辑](#4-关键功能实现逻辑)
5. [配置说明](#5-配置说明)
6. [常见修改场景与操作步骤](#6-常见修改场景与操作步骤)
7. [代码规范与最佳实践](#7-代码规范与最佳实践)

---

## 1. 项目背景与目标

### 1.1 项目概述

**项目名称**: 今天蛋筒什么  
**英文名称**: Limbus Company Random Selector  
**项目类型**: 游戏辅助工具网站  
**目标用户**: Limbus Company（边狱公司）游戏玩家

### 1.2 核心功能

1. **随机选择器**: 随机选择罪人和人格，用于游戏挑战
2. **筛选系统**: 自定义参与随机的罪人和人格池
3. **计时器**: 记录单通挑战时长，支持提交到排行榜
4. **全球排行榜**: 展示玩家单通竞速成绩
5. **攻略系统**: 玩家投稿和浏览游戏攻略
6. **管理后台**: 审核排行榜记录、攻略内容、用户管理

### 1.3 项目目标

- 提供公平、有趣的随机选择体验
- 建立玩家社区，分享攻略和成绩
- 支持多设备访问（响应式设计）
- 零成本部署和运维（Cloudflare免费套餐）

---

## 2. 技术栈与依赖说明

### 2.1 核心技术栈

| 层级 | 技术 | 版本/说明 |
|------|------|----------|
| **前端** | 原生 JavaScript (ES6+) | 无框架依赖 |
| **样式** | CSS3 | 自定义CSS变量主题 |
| **后端** | Cloudflare Workers | Serverless Functions |
| **数据库** | Cloudflare D1 | SQLite边缘数据库 |
| **存储** | Cloudflare R2 | 对象存储（图片） |
| **缓存** | Cloudflare KV | 键值存储 |
| **部署** | Cloudflare Pages | 静态网站托管 |
| **验证** | Cloudflare Turnstile | 人机验证 |

### 2.2 外部CDN依赖

```html
<!-- 字体 -->
Google Fonts (Noto Serif SC, Cinzel)

<!-- 图标 -->
Font Awesome 6.4.0

<!-- 人机验证 -->
Cloudflare Turnstile API

<!-- 图表（仅管理后台） -->
Chart.js 4.4.0
```

### 2.3 浏览器API使用

- **Crypto API**: `crypto.randomUUID()`, `crypto.subtle.digest()`
- **Fetch API**: HTTP请求
- **localStorage**: 本地状态持久化
- **File API**: 文件上传处理

---

## 3. 目录结构与核心模块解析

### 3.1 项目目录结构

```
deploy/
├── 📄 HTML页面文件
│   ├── index.html                 # 主选择器页面
│   ├── global-ranking.html        # 全球排行榜
│   ├── guides.html               # 攻略中心
│   ├── admin-login.html          # 管理员登录
│   ├── admin-dashboard.html      # 数据统计
│   ├── admin.html                # 排行榜审核
│   ├── admin-guides.html         # 攻略审核
│   ├── admin-users.html          # 用户管理
│   ├── admin-settings.html       # 系统配置
│   └── ...
│
├── 📁 css/                       # 样式文件
│   ├── reset.css                 # CSS重置
│   ├── common.css                # 通用样式
│   ├── limbus-theme-v2.css       # 主题样式
│   ├── auth-module.css           # 认证模块样式
│   └── module/                   # 模块样式
│       ├── dynamic-styles.css
│       ├── global-ranking.css
│       └── guides.css
│
├── 📁 js/                        # JavaScript文件
│   ├── main.js                   # 应用入口
│   ├── config.js                 # API配置
│   ├── ui.js                     # UI工具
│   ├── modal.js                  # 弹窗组件
│   ├── turnstile.js              # Turnstile包装器
│   │
│   ├── 📁 core/                  # 核心层
│   │   ├── appState.js           # 全局状态管理
│   │   ├── eventBus.js           # 事件总线
│   │   └── logger.js             # 日志记录器
│   │
│   ├── 📁 controllers/           # 控制层
│   │   ├── scrollController.js   # 滚动控制器
│   │   ├── filterController.js   # 筛选控制器
│   │   ├── settingsController.js # 设置控制器
│   │   ├── timerController.js    # 计时器控制器
│   │   ├── animationController.js# 动画控制器
│   │   ├── uiController.js       # UI控制器
│   │   └── globalRankingController.js
│   │
│   ├── 📁 modules/               # 功能模块
│   │   ├── authModule.js         # 认证模块
│   │   └── guideImageUploader.js # 图片上传
│   │
│   ├── 📁 api/                   # API接口
│   │   └── cloudbaseApi.js
│   │
│   └── 📁 i18n/                  # 国际化
│       ├── zh.js
│       └── en.js
│
├── 📁 data/                      # 数据文件
│   ├── characters.js             # 罪人和人格数据
│   ├── config.js                 # 数据配置
│   └── utils/
│       └── helpers.js
│
├── 📁 functions/                 # Cloudflare Functions
│   └── api/
│       ├── [[path]].js           # API路由主入口
│       ├── db-init.js            # 数据库初始化
│       └── stats.js              # 统计功能
│
├── 📁 assets/                    # 静态资源
│   ├── images/                   # 图片资源
│   │   └── [罪人名称]/
│   └── videos/                   # 彩蛋视频
│
├── 📄 配置文件
│   ├── wrangler.toml             # Cloudflare配置
│   ├── _headers                  # HTTP头配置
│   └── _routes.json              # 路由配置
│
└── 📄 文档文件
    ├── README.md
    └── PROJECT_DOCUMENTATION.md  # 本文档
```

### 3.2 核心模块详解

#### 3.2.1 AppState (全局状态管理)

**文件**: `js/core/appState.js`

**职责**: 单一数据源，集中管理所有应用状态

**核心状态结构**:

```javascript
{
  app: {
    currentPage: 'selector',      // 当前页面
    hasUnsavedChanges: false,     // 未保存更改标记
    isInitialized: false          // 初始化状态
  },
  game: {
    selectedSinner: null,         // 选中的罪人
    selectedPersona: null,        // 选中的人格
    isScrolling: false            // 是否正在滚动
  },
  filters: {
    sinners: {},                  // 罪人筛选状态 {id: boolean}
    personalities: {}             // 人格筛选状态 {sinnerId: {index: boolean}}
  },
  settings: {
    theme: 'dark',
    language: 'zh'
  },
  timer: {
    elapsedSeconds: 0,
    isRunning: false
  }
}
```

**关键方法**:

```javascript
// 获取状态
appState.get('game.selectedSinner')

// 设置状态（自动通知订阅者）
appState.set('game.selectedSinner', sinnerData)

// 订阅状态变化
appState.subscribe('game.selectedSinner', callback)

// 批量更新
appState.batchUpdate({
  'game.selectedSinner': sinner,
  'game.selectedPersona': persona
})
```

#### 3.2.2 EventBus (事件总线)

**文件**: `js/core/eventBus.js`

**职责**: 模块间解耦通信

**核心事件列表**:

| 事件名称 | 触发时机 | 数据负载 |
|---------|---------|---------|
| `SINNER_SELECTED` | 罪人选择完成 | `{sinner, index}` |
| `PERSONA_SELECTED` | 人格选择完成 | `{persona, sinner}` |
| `FILTER_CHANGED` | 筛选条件变化 | `{type, id, value}` |
| `SCROLL_START` | 滚动开始 | `{type: 'sinner' \| 'persona'}` |
| `SCROLL_STOP` | 滚动停止 | `{type, selected}` |
| `TIMER_STARTED` | 计时器启动 | - |
| `TIMER_STOPPED` | 计时器停止 | `{elapsedSeconds}` |
| `APP_READY` | 应用初始化完成 | - |

**使用示例**:

```javascript
// 订阅事件
eventBus.subscribe('SINNER_SELECTED', (data) => {
  console.log('选中罪人:', data.sinner)
})

// 发布事件
eventBus.emit('SINNER_SELECTED', {sinner: sinnerData, index: 5})
```

#### 3.2.3 ScrollController (滚动控制器)

**文件**: `js/controllers/scrollController.js`

**职责**: 管理罪人和人格的滚动动画和选择逻辑

**核心功能**:

1. **创建滚动列表**: 根据筛选结果生成滚动项
2. **滚动动画**: CSS transform + requestAnimationFrame
3. **随机选择**: 使用 `secureRandInt` 生成随机数
4. **彩蛋检测**: 特定组合触发视频播放

**关键方法**:

```javascript
// 开始罪人滚动
startSinnerScroll()

// 停止罪人滚动并选择
stopSinnerScroll()

// 开始人格滚动
startPersonaScroll()

// 停止人格滚动并选择
stopPersonaScroll()

// 创建滚动列表
_createScrollItems(container, items)
```

#### 3.2.4 AuthModule (认证模块)

**文件**: `js/modules/authModule.js`

**职责**: 用户登录/注册功能

**关键特性**:

- Turnstile人机验证
- localStorage存储登录状态
- 支持多页面同步

**使用示例**:

```javascript
// 初始化
AuthModule.init({
  onUserChange: (user) => updateUI(user),
  showMessage: (msg, type) => showToast(msg, type)
})

// 打开登录弹窗
AuthModule.openAuthModal()

// 检查登录状态
if (AuthModule.isLoggedIn()) {
  const user = AuthModule.getUser()
}
```

#### 3.2.5 API路由 (Cloudflare Functions)

**文件**: `functions/api/[[path]].js`

**架构**: 单一文件处理所有 `/api/*` 请求

**路由分发逻辑**:

```javascript
export async function onRequest(context) {
  const { request, env, params } = context
  const url = new URL(request.url)
  const path = url.pathname
  
  // 速率限制检查
  // ...
  
  // 路由分发
  if (path.startsWith('/api/guides')) {
    return handleGuides(request, env, headers, path)
  }
  
  if (path.startsWith('/api/rankings')) {
    return handleRankings(request, env, headers, path)
  }
  
  if (path.startsWith('/api/auth')) {
    return handleAuth(request, env, headers, path)
  }
  
  // ...
}
```

---

## 4. 关键功能实现逻辑

### 4.1 随机选择算法

**算法**: Fisher-Yates 洗牌 + 加权随机

```javascript
// 安全随机数生成
function secureRandInt(min, max) {
  const range = max - min
  const randomBuffer = new Uint32Array(1)
  crypto.getRandomValues(randomBuffer)
  return min + (randomBuffer[0] % range)
}

// 滚动选择逻辑
function selectWithScroll(items, duration = 3000) {
  const totalItems = items.length
  const targetIndex = secureRandInt(0, totalItems)
  
  // 计算滚动距离（多圈 + 目标位置）
  const spins = 3  // 滚动圈数
  const itemHeight = 80
  const totalDistance = (spins * totalItems + targetIndex) * itemHeight
  
  return {
    targetIndex,
    targetItem: items[targetIndex],
    scrollDistance: totalDistance
  }
}
```

### 4.2 筛选系统实现

**数据流**:

```
用户勾选/取消
    ↓
更新 appState.filters.sinners
    ↓
触发 FILTER_CHANGED 事件
    ↓
filterController 重新计算可用人格
    ↓
更新 UI 显示
```

**筛选验证**:

```javascript
function validateFilters() {
  const { sinners, personalities } = appState.get('filters')
  
  // 至少选择1个罪人
  const selectedSinners = Object.entries(sinners)
    .filter(([_, enabled]) => enabled)
  
  if (selectedSinners.length === 0) {
    return { valid: false, message: '请至少选择1个罪人' }
  }
  
  // 每个选中的罪人至少选择1个人格
  for (const [sinnerId, _] of selectedSinners) {
    const sinnerPersonalities = personalities[sinnerId]
    const hasEnabled = Object.values(sinnerPersonalities)
      .some(enabled => enabled)
    
    if (!hasEnabled) {
      return { valid: false, message: '请为每个罪人至少选择1个人格' }
    }
  }
  
  return { valid: true }
}
```

### 4.3 计时器实现

**精度处理**: 使用 `Date.now()` 差值计算，而非 `setInterval` 累加

```javascript
class TimerController {
  constructor() {
    this.startTime = null
    this.elapsedSeconds = 0
    this.isRunning = false
  }
  
  start() {
    this.startTime = Date.now() - (this.elapsedSeconds * 1000)
    this.isRunning = true
    this.tick()
  }
  
  tick() {
    if (!this.isRunning) return
    
    const now = Date.now()
    this.elapsedSeconds = Math.floor((now - this.startTime) / 1000)
    
    this.updateDisplay()
    requestAnimationFrame(() => this.tick())
  }
  
  stop() {
    this.isRunning = false
  }
  
  reset() {
    this.isRunning = false
    this.startTime = null
    this.elapsedSeconds = 0
    this.updateDisplay()
  }
}
```

### 4.4 图片上传流程

```javascript
async function uploadImage(file) {
  // 1. 验证文件
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('不支持的文件格式')
  }
  
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('文件大小超过10MB限制')
  }
  
  // 2. 创建FormData
  const formData = new FormData()
  formData.append('file', file)
  
  // 3. 上传请求
  const response = await fetch('/api/upload/image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  })
  
  // 4. 返回URL
  const { data } = await response.json()
  return data.url  // R2_PUBLIC_URL/path
}
```

---

## 5. 配置说明

### 5.1 wrangler.toml (Cloudflare配置)

```toml
name = "limbus-72b"
compatibility_date = "2024-01-01"
pages_build_output_dir = "."

# D1数据库绑定
[[d1_databases]]
binding = "DB"
database_name = "limbus-db"
database_id = "ec60dc31-5a42-49b6-be8f-bc2157b78afc"

# R2存储桶绑定
[[r2_buckets]]
binding = "IMAGES_BUCKET"
bucket_name = "limbus-images"

# KV命名空间绑定
[[kv_namespaces]]
binding = "CAPTCHA_KV"
id = "e66c7d393f9b47ca8ce50997c5d940cd"

# 环境变量
[vars]
R2_PUBLIC_URL = "https://pub-85e5adbda62644849fa4e161195ea01a.r2.dev"
```

### 5.2 _headers (HTTP头配置)

```
# JavaScript文件缓存1小时
/*.js
  Cache-Control: public, max-age=3600, must-revalidate

# CSS文件缓存1小时
/css/*.css
  Cache-Control: public, max-age=3600, must-revalidate

# HTML文件不缓存
/*.html
  Cache-Control: public, max-age=0, must-revalidate

# 图片缓存7天
/assets/images/*
  Cache-Control: public, max-age=604800, immutable

# API端点短时间缓存
/api/rankings
  Cache-Control: public, max-age=60

# 安全头
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

### 5.3 js/config.js (前端API配置)

```javascript
const API_CONFIG = {
  development: {
    baseUrl: 'http://localhost:8788'
  },
  production: {
    baseUrl: ''  // 使用相对路径
  }
}

// 自动检测环境
function detectEnvironment() {
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'development'
  }
  return 'production'
}

// 全局API基础URL
window.API_BASE = getApiBaseUrl()  // '/api' 或 'http://localhost:8788/api'
```

---

## 6. 常见修改场景与操作步骤

### 6.1 添加新罪人

**步骤**:

1. **更新数据文件** (`data/characters.js`):

```javascript
{
  id: 13,  // 新ID
  name: '新罪人',
  nameEn: 'New Sinner',
  personalities: [
    { name: '人格1', nameEn: 'Personality 1', rarity: 3 },
    { name: '人格2', nameEn: 'Personality 2', rarity: 2 }
  ]
}
```

2. **添加图片资源**:
   - 创建目录: `assets/images/New_Sinner/`
   - 添加图片: `New_Sinner-LCB.jpg` (立绘), `New_Sinner-N.webp` (头像) 等

3. **更新筛选器**:
   - 代码会自动读取 `characters.js`，无需额外修改

### 6.2 修改API端点

**步骤**:

1. **编辑路由文件** (`functions/api/[[path]].js`):

```javascript
// 在路由分发区域添加
if (path === '/api/new-endpoint') {
  return handleNewEndpoint(request, env, headers)
}

// 实现处理函数
async function handleNewEndpoint(request, env, headers) {
  // 实现逻辑
  return jsonResponse({ code: 200, data: {} }, 200, headers)
}
```

2. **测试API**:
   ```bash
   curl https://084limbus.xyz/api/new-endpoint
   ```

### 6.3 修改登录弹窗

**步骤**:

1. **编辑认证模块** (`js/modules/authModule.js`):

```javascript
openAuthModal() {
  // 修改模态框HTML
  modal.innerHTML = `
    <div class="auth-modal-content">
      <!-- 自定义内容 -->
    </div>
  `
}
```

2. **更新样式** (`css/auth-module.css`):

```css
.auth-modal-content {
  /* 自定义样式 */
}
```

### 6.4 添加彩蛋

**步骤**:

1. **编辑滚动控制器** (`js/controllers/scrollController.js`):

```javascript
const easterEggConfig = {
  [sinnerId]: {
    [personalityName]: 'assets/videos/video-file.mp4'
  }
}
```

2. **添加视频文件**:
   - 复制视频到 `assets/videos/`

### 6.5 修改数据库表结构

**步骤**:

1. **使用db-fix端点** (`functions/api/[[path]].js`):

```javascript
async function handleDbFix(request, env, headers) {
  // 添加新字段
  await env.DB.prepare(
    'ALTER TABLE table_name ADD COLUMN new_field TEXT'
  ).run()
}
```

2. **访问端点**:
   ```
   POST https://084limbus.xyz/api/db-fix
   ```

---

## 7. 代码规范与最佳实践

### 7.1 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 变量 | camelCase | `userName`, `isLoggedIn` |
| 常量 | UPPER_SNAKE_CASE | `TURNSTILE_SITE_KEY` |
| 类/构造函数 | PascalCase | `AuthModule`, `TimerController` |
| 文件 | kebab-case | `auth-module.js`, `scroll-controller.js` |
| 私有方法 | _前缀 | `_bindModalEvents()` |

### 7.2 模块组织原则

1. **单一职责**: 每个模块只负责一个功能领域
2. **依赖注入**: 通过构造函数或init方法传入依赖
3. **事件驱动**: 使用EventBus进行模块间通信，避免直接调用
4. **状态集中**: 所有状态通过AppState管理，避免分散存储

### 7.3 错误处理规范

```javascript
// API错误处理
try {
  const response = await fetch('/api/endpoint')
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const result = await response.json()
  
  if (result.code !== 200) {
    throw new Error(result.message)
  }
  
  return result.data
} catch (error) {
  console.error('[ModuleName] 操作失败:', error)
  showMessage(error.message, 'error')
  return null
}
```

### 7.4 性能优化建议

1. **图片优化**:
   - 使用WebP格式
   - 提供多种尺寸
   - 懒加载非首屏图片

2. **JavaScript优化**:
   - 使用事件委托减少监听器数量
   - 防抖/节流高频事件（scroll, resize）
   - 使用requestAnimationFrame进行动画

3. **API优化**:
   - 使用KV缓存频繁请求的数据
   - 分页加载大数据集
   - 压缩响应数据

### 7.5 安全最佳实践

1. **输入验证**:
   - 所有用户输入必须验证
   - 使用参数化查询防止SQL注入
   - 转义HTML输出防止XSS

2. **认证安全**:
   - Token设置过期时间
   - 敏感操作需要重新验证
   - 使用HTTPS传输

3. **速率限制**:
   - API端点已实现IP限流
   - 敏感端点（登录、注册）限制更严格

---

## 8. 系统诊断与优化报告 (System Diagnosis & Optimization)
 
 本章节记录了针对 V1.6.0 版本进行的系统性诊断、Bug 修复及性能优化措施。
 
 ### 8.1 已修复的已知问题 (Known Bugs Fixed)
 
 | 优先级 | 问题描述 | 根因分析 | 归属组件 | 修复方案 |
 |-------|----------|---------|---------|---------|
 | **P0** | **认证绕过漏洞**<br>攻击者可伪造 Base64 Token 冒充任意用户 | Token 生成未使用加密签名，仅做 Base64 编码，客户端可篡改 | 后端 API | 引入 HMAC-SHA256 签名机制 (`signJwt`/`verifyJwt`)，使用 `crypto.subtle` API |
 | **P0** | **密码存储不安全**<br>数据库泄露会导致用户密码被批量破解 | 仅使用 SHA-256 哈希，未加盐 (Salt) | 后端 API | 升级为 PBKDF2-HMAC-SHA256 算法，自动生成并存储 Salt |
 | **P1** | **状态丢失**<br>刷新页面或调用 `getState` 时设置丢失 | `JSON.stringify` 无法序列化 ES6 `Map` 对象 (Settings) | 前端 Core | 在 `appState.js` 中手动处理 Map 的序列化与反序列化 |
 | **P1** | **敏感密钥硬编码**<br>源码中包含 Turnstile Secret Key 回退值 | 开发遗留的硬编码默认值 | 后端 API | 移除硬编码，强制校验 `env.TURNSTILE_SECRET_KEY` |
 | **P2** | **主线程阻塞**<br>频繁记录日志导致页面卡顿 | `logger.js` 同步写入 `localStorage`，触发频繁 I/O | 前端 Core | 使用 `requestIdleCallback` 或 `setTimeout` 实现异步防抖写入 |
 | **P2** | **CORS 过于宽松**<br>API 允许任意 Origin 访问 | `Access-Control-Allow-Origin: *` 配置 | 后端 API | 引入 `env.ALLOWED_ORIGIN` 配置项，限制跨域来源 |
 
 ### 8.2 优化措施实施
 
 #### 1. 端到端自动化测试 (E2E Testing)
 引入 `Vitest` + `Miniflare` 框架，建立本地仿真测试环境。
 - **配置文件**: `vitest.config.js`
 - **测试用例**: `tests/api.test.js`
 - **覆盖范围**: 健康检查、登录流程、权限验证
 
 #### 2. 可观测性增强 (Observability)
 在 API 关键路径引入结构化日志 (`logEvent`)。
 - **日志格式**: JSON 结构，包含 `timestamp`, `event`, `ip`, `duration` 等字段。
 - **监控指标**: 
   - `request_start`: 请求开始
   - `login_success` / `login_fail`: 认证审计
   - `turnstile_verify`: 验证码验证结果
 
 #### 3. 安全性升级
 - **JWT**: 实现了符合 RFC 7519 标准的简易 JWT 签名与验证。
 - **Password**: 实现了 NIST 推荐的加盐哈希存储策略。
 
 ### 8.3 部署验证指南
 
 1. **环境准备**:
    ```bash
    npm install  # 安装测试依赖
    ```
 
 2. **运行测试**:
    ```bash
    npm test
    ```
    预期结果: 所有测试用例通过 (Pass)。
 
 3. **环境变量配置**:
    在 Cloudflare Dashboard 或 `wrangler.toml` 中必须配置:
    - `JWT_SECRET`: 用于 Token 签名的强随机字符串 (新增)
    - `TURNSTILE_SECRET_KEY`: Turnstile 密钥
    - `ALLOWED_ORIGIN`: 允许的前端域名 (如 `https://example.com`)
 
 ---
 
 ## 附录

### A. 数据库表结构

```sql
-- 排行榜记录
CREATE TABLE rankings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  sinner TEXT NOT NULL,
  persona TEXT NOT NULL,
  floor_level TEXT NOT NULL,
  time INTEGER NOT NULL,
  screenshot_url TEXT,
  video_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 攻略内容
CREATE TABLE guides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NOT NULL,
  sinner TEXT NOT NULL,
  persona TEXT NOT NULL,
  media_urls TEXT,  -- JSON数组
  content_images TEXT,  -- JSON数组
  tags TEXT,  -- JSON数组
  views INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- SHA-256哈希
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);
```

### B. 环境变量说明

| 变量名 | 说明 | 获取方式 |
|--------|------|---------|
| `TURNSTILE_SECRET_KEY` | Turnstile密钥 | Cloudflare Dashboard |
| `TURNSTILE_SITE_KEY` | Turnstile站点密钥 | Cloudflare Dashboard |
| `DB` | D1数据库绑定 | wrangler.toml配置 |
| `IMAGES_BUCKET` | R2存储桶绑定 | wrangler.toml配置 |
| `CAPTCHA_KV` | KV命名空间绑定 | wrangler.toml配置 |

### C. 部署检查清单

- [ ] 代码已提交到GitHub
- [ ] wrangler.toml配置正确
- [ ] _headers缓存策略合适
- [ ] 数据库已初始化
- [ ] KV命名空间已创建
- [ ] R2存储桶已创建
- [ ] Turnstile密钥已配置
- [ ] 环境变量已设置

---

**文档维护**: 当修改项目架构或添加新功能时，请同步更新本文档。
