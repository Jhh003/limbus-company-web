# 今天蛋筒什么 - 项目架构文档

> 本文档旨在帮助AI快速理解项目结构、技术栈和核心逻辑

## 📋 项目概述

**项目名称**: 今天蛋筒什么 (Limbus Company 随机选择器)
**部署地址**: https://084limbus.xyz/
**技术栈**: Cloudflare Pages + D1 + R2 + KV
**项目类型**: 游戏粉丝向网站，提供角色随机选择、排行榜、攻略分享

---

## 🗂️ 目录结构

```
deploy/
├── index.html              # 主页 - 罪人人格随机选择器
├── guides.html             # 攻略展示页面
├── global-ranking.html     # 全球排行榜
├── admin*.html             # 管理后台系列页面
│   ├── admin.html          # 排行榜审核
│   ├── admin-dashboard.html # 数据统计
│   ├── admin-guides.html   # 攻略审核
│   ├── admin-users.html    # 用户管理
│   ├── admin-settings.html # 系统配置
│   └── admin-login.html    # 管理员登录
│
├── assets/                 # 静态资源
│   ├── images/             # 12名罪人的角色图片
│   │   ├── Don_Quixote/    # 唐吉诃德
│   │   ├── Faust/          # 浮士德
│   │   ├── Gregor/         # 格里高尔
│   │   ├── Heathcliff/     # 希斯克利夫
│   │   ├── Hong_Lu/        # 鸿璐
│   │   ├── Ishmael/        # 以实玛利
│   │   ├── Meursault/      # 默尔索
│   │   ├── Outis/          # 奥提斯
│   │   ├── Rodion/         # 罗佳
│   │   ├── Ryoshu/         # 良秀
│   │   ├── Sinclair/       # 辛克莱
│   │   └── Yi_Sang/        # 李箱
│   └── videos/             # 彩蛋视频
│
├── css/                    # 样式层
│   ├── module/             # 模块化CSS
│   ├── reset.css           # CSS重置
│   ├── limbus-theme-v2.css # 主题样式
│   └── admin-*.css         # 管理后台样式
│
├── js/                     # 脚本层
│   ├── core/               # 核心基础设施
│   │   ├── appState.js     # 全局状态管理
│   │   ├── eventBus.js     # 事件总线
│   │   └── logger.js       # 日志工具
│   ├── controllers/        # 业务控制器
│   │   ├── scrollController.js    # 滚动动画
│   │   ├── filterController.js    # 筛选逻辑
│   │   ├── timerController.js     # 计时器
│   │   └── settingsController.js  # 设置管理
│   ├── modules/            # 独立功能模块
│   │   ├── authModule.js   # 认证模块
│   │   └── guideImageUploader.js  # 图片上传
│   ├── api/                # API封装
│   ├── i18n/               # 国际化
│   └── config.js           # 配置文件
│
├── data/                   # 数据层
│   ├── characters.js       # 罪人与人格数据
│   └── utils/              # 数据工具
│
└── functions/              # Cloudflare Functions (后端)
    └── api/
        ├── [[path]].js     # API路由主入口
        ├── db-init.js      # 数据库初始化
        └── stats.js        # 统计功能
```

---

## 🏗️ 架构模式

### 前端架构: MVC + 观察者模式

```
┌─────────────────────────────────────────────────────────┐
│  View (HTML页面)                                         │
│  - index.html: 随机选择器主界面                          │
│  - guides.html: 攻略展示                                 │
│  - admin*.html: 管理后台                                 │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Controllers (业务控制器)                                │
│  - scrollController: 滚动动画、罪人人格选择              │
│  - filterController: 筛选逻辑                            │
│  - timerController: 计时器功能                           │
│  - settingsController: 设置管理                          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Core Services (核心服务)                                │
│  - appState: 全局状态管理 (类似Redux)                    │
│  - eventBus: 事件总线 (发布订阅模式)                     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Data (数据层)                                           │
│  - characters.js: 角色数据                               │
│  - Cloudflare API: 后端数据                              │
└─────────────────────────────────────────────────────────┘
```

---

## 💻 技术栈

### 前端
| 技术 | 用途 |
|------|------|
| HTML5/CSS3/ES6+ | 基础技术 |
| ES6 Modules | 模块化 |
| CSS Variables | 主题切换 |
| Font Awesome 6.4.0 | 图标 |
| Chart.js 4.4.0 | 数据图表 |
| localStorage | 状态持久化 |

### 后端 (Cloudflare)
| 技术 | 用途 |
|------|------|
| Cloudflare Pages | 静态托管 |
| Cloudflare Functions | Serverless API |
| Cloudflare D1 | SQLite数据库 |
| Cloudflare R2 | 对象存储(图片) |
| Cloudflare KV | 键值存储(验证码) |

---

## 🗄️ 数据库设计 (D1 - SQLite)

### 表结构

#### 1. rankings (排行榜)
```sql
CREATE TABLE rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,           -- 用户名
    sinner TEXT NOT NULL,             -- 罪人名称
    persona TEXT NOT NULL,            -- 人格名称
    floor_level TEXT NOT NULL,        -- 楼层等级
    time INTEGER NOT NULL,            -- 通关时间(秒)
    screenshot_url TEXT,              -- 截图URL
    video_url TEXT,                   -- 视频URL
    status TEXT DEFAULT 'pending',    -- pending/approved/rejected
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. guides (攻略)
```sql
CREATE TABLE guides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT,
    sinner TEXT NOT NULL,
    persona TEXT NOT NULL,
    floorLevel TEXT NOT NULL,
    mediaType TEXT DEFAULT 'video',
    content TEXT NOT NULL,
    media_urls TEXT,                  -- JSON数组
    coverUrl TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. users (用户)
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,           -- SHA-256哈希
    role TEXT DEFAULT 'user',         -- user/admin
    status TEXT DEFAULT 'active',     -- active/banned
    last_login_at DATETIME,
    register_ip TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. admins (管理员)
```sql
CREATE TABLE admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin',        -- admin/superadmin
    status TEXT DEFAULT 'active',
    last_login_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 API 设计

### 认证方式
```javascript
// Token格式: Base64编码的JSON
const token = btoa(JSON.stringify({
    id: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + 86400000  // 24小时过期
}));

// 请求头
Authorization: Bearer <token>
```

### 响应格式
```javascript
// 成功
{ code: 200, message: "成功", data: {} }

// 失败
{ code: 400|401|403|404|500, message: "错误描述", error: "详情" }
```

### 核心端点

#### 公共端点 (无需认证)
| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/captcha` | GET | 获取验证码 |
| `/api/rankings` | GET | 获取排行榜 |
| `/api/rankings` | POST | 提交记录 |
| `/api/guides` | GET | 获取攻略列表 |
| `/api/admin/login` | POST | 管理员登录 |

#### 需认证端点
| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/rankings/reviewed` | GET | 审核列表(分页) |
| `/api/rankings/count` | GET | 状态计数 |
| `/api/rankings/approve/:id` | POST | 审核操作 |
| `/api/rankings/:id` | DELETE | 删除记录 |
| `/api/admin/guides` | GET | 攻略管理列表 |
| `/api/admin/guide/:id` | POST/DELETE | 审核/删除攻略 |
| `/api/admin/users` | GET | 用户列表 |
| `/api/admin/users/:id/ban` | POST | 禁用用户 |
| `/api/admin/config` | GET/PUT | 系统配置 |
| `/api/upload/image` | POST | 图片上传 |

---

## 🎯 核心功能逻辑

### 1. 随机选择器
```javascript
// 两级选择机制
// 1. 从12名罪人中随机选择
// 2. 从选中罪人的可用人格中随机选择

// 彩蛋系统: 特定罪人+人格组合触发视频
const easterEggs = {
    '浮士德-黑兽-卯魁首': 'faust_mao_kui_shou.mp4',
    '默尔索-拇指东部指挥官IIII': 'meursault_thumbs.mp4',
    '鸿璐-鸿园的君主': 'Hong_Lu_Hong_Yuan_The_King.mp4',
    '罗佳-脑叶公司E.G.O:泪锋之剑': 'rodion_tear_sword.mp4'
};
```

### 2. 状态管理 (appState)
```javascript
// 全局状态结构
{
    app: { currentPage, hasUnsavedChanges, isInitialized },
    game: { selectedSinner, selectedPersona, isScrolling },
    filters: { sinners: {}, personalities: {} },
    settings: { personality: Map, theme, language },
    timer: { isRunning, elapsedSeconds },
    ranking: { localRecords, globalRecords }
}

// 使用方式
import appState from './js/core/appState.js';
appState.set('game.selectedSinner', sinner);
appState.get('game.selectedSinner');
appState.subscribe('game.selectedSinner', callback);
```

### 3. 事件总线 (eventBus)
```javascript
// 核心事件
const GameEvents = {
    SCROLL_START: 'scroll:start',
    SCROLL_STOP: 'scroll:stop',
    SINNER_SELECTED: 'sinner:selected',
    PERSONA_SELECTED: 'persona:selected',
    FILTER_CHANGED: 'filter:changed',
    TIMER_START: 'timer:start',
    TIMER_TICK: 'timer:tick'
};

// 使用方式
import eventBus, { GameEvents } from './js/core/eventBus.js';
eventBus.emit(GameEvents.SINNER_SELECTED, sinnerData);
eventBus.on(GameEvents.SINNER_SELECTED, (data) => {...});
```

---

## 🔐 管理后台

### 导航结构 (统一所有页面)
```
┌─────────────────────────────────────┐
│  管理后台                            │
├─────────────────────────────────────┤
│  📊 数据统计                         │
│  📋 排行榜审核  ← admin.html        │
│  📖 攻略审核    ← admin-guides.html │
│  👥 用户管理    ← admin-users.html  │
│  ⚙️ 系统配置    ← admin-settings.html│
└─────────────────────────────────────┘
```

### 页面功能
| 页面 | 功能 |
|------|------|
| admin.html | 排行榜审核(待审核/已通过/已驳回) |
| admin-dashboard.html | 数据统计图表(用户/内容/趋势) |
| admin-guides.html | 攻略审核管理 |
| admin-users.html | 用户列表、禁用/解禁 |
| admin-settings.html | 网站配置、功能开关 |

---

## 🚀 部署与配置

### wrangler.toml 配置
```toml
name = "limbus-72b"
compatibility_date = "2024-01-01"
pages_build_output_dir = "."

[[d1_databases]]
binding = "DB"
database_name = "limbus-db"
database_id = "ec60dc31-5a42-49b6-be8f-bc2157b78afc"

[[r2_buckets]]
binding = "IMAGES_BUCKET"
bucket_name = "limbus-images"

[[kv_namespaces]]
binding = "CAPTCHA_KV"
id = "e66c7d393f9b47ca8ce50997c5d940cd"

[vars]
R2_PUBLIC_URL = "https://pub-85e5adbda62644849fa4e161195ea01a.r2.dev"
```

### 环境要求
- Node.js 18+
- Wrangler CLI
- Cloudflare 账号

---

## ⚠️ 常见问题与解决

### 1. 数据库表不存在 (500错误)
**症状**: API返回500错误，日志显示表不存在
**解决**: 执行数据库初始化
```bash
curl -X POST https://084limbus.xyz/api/db-init
```

### 2. 导航菜单不一致
**症状**: 某些页面缺少导航项
**解决**: 检查各admin页面的sidebar-nav部分，确保链接一致

### 3. 图片上传失败
**症状**: 上传图片返回错误
**解决**: 检查R2 bucket是否配置正确，CORS设置是否允许

### 4. 验证码不显示
**症状**: 登录页面无验证码
**解决**: 检查KV命名空间是否正确绑定

---

## 📝 开发规范

### 代码风格
- 使用 ES6+ 语法
- 模块导入使用相对路径
- 异步操作使用 async/await
- 错误处理使用 try/catch

### API开发
- 新端点添加到 `functions/api/[[path]].js`
- 遵循 RESTful 规范
- 统一响应格式
- 添加认证检查（如需要）

### 数据库变更
- 修改 `functions/api/db-init.js`
- 添加表结构变更逻辑
- 考虑向后兼容性

---

## 🔗 关键文件速查

| 文件 | 用途 |
|------|------|
| `functions/api/[[path]].js` | API路由主入口 |
| `functions/api/db-init.js` | 数据库初始化 |
| `js/core/appState.js` | 全局状态管理 |
| `js/core/eventBus.js` | 事件总线 |
| `data/characters.js` | 角色数据 |
| `js/config.js` | 前端配置 |
| `wrangler.toml` | Cloudflare配置 |

---

## 📚 扩展阅读

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)
- [Limbus Company 游戏](https://limbuscompany.com/)

---

*文档版本: 1.0*
*最后更新: 2024年*
*作者: AI Assistant*
