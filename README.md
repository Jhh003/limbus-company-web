# 今天蛋筒什么 - Limbus Company 随机选择器

## 项目概述

一个基于 Limbus Company 游戏的粉丝向网站，提供角色随机选择、排行榜、攻略分享等功能。

**网站地址**: https://084limbus.xyz/

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **主题**: 边狱巴士 (Limbus Company) 风格设计
- **部署**: Cloudflare Pages
- **后端 API**: Cloudflare Functions
- **图表**: Chart.js

## 功能模块

### 1. 主页功能
- 角色随机选择器
- 人格标签切换
- 赛季选择
- 帮助说明

### 2. 排行榜
- 全球排行榜展示
- 用户提交成绩
- 实时排名更新

### 3. 攻略系统
- 攻略发布（支持文字/图片/视频）
- 攻略浏览
- 攻略审核（管理员）

### 4. 管理后台
- **数据统计**: 用户增长趋势、活跃度统计
- **攻略审核**: 待审核/已通过/已驳回攻略管理
- **用户管理**: 用户列表、禁用/解禁账号
- **系统配置**: 网站设置、功能开关

## 管理后台页面

| 页面 | 功能描述 |
|------|----------|
| `admin-dashboard.html` | 数据统计仪表盘 |
| `admin-guides.html` | 攻略审核管理 |
| `admin-users.html` | 用户账号管理 |
| `admin-settings.html` | 系统配置 |
| `admin-login.html` | 管理员登录 |
| `admin-change-password.html` | 修改密码 |

## 文件结构

```
deploy/
├── index.html              # 主页
├── guides.html             # 攻略页面
├── global-ranking.html     # 排行榜
├── admin-dashboard.html    # 管理后台-数据统计
├── admin-guides.html       # 管理后台-攻略审核
├── admin-users.html        # 管理后台-用户管理
├── admin-settings.html     # 管理后台-系统配置
├── admin-login.html        # 管理后台-登录
├── admin-change-password.html # 管理后台-修改密码
├── css/
│   ├── limbus-theme-v2.css    # 主题样式
│   └── module/
│       └── admin-common.css   # 管理后台通用样式
├── js/                     # JavaScript 文件
├── data/                   # 数据文件
├── functions/              # Cloudflare Functions
└── assets/                 # 图片、视频资源
```

## 部署说明

### 环境要求
- Cloudflare Pages 账号
- GitHub 仓库

### 部署步骤

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "更新说明"
   git push
   ```

2. **Cloudflare 自动部署**
   - 代码推送到 main 分支后，Cloudflare Pages 会自动构建和部署
   - 部署完成后，访问 https://084limbus.xyz/

## API 接口

### 统计数据
- `GET /api/stats?range=day|week|month` - 获取统计数据

### 攻略管理
- `GET /api/admin/guides?status=pending|approved|rejected` - 获取攻略列表
- `GET /api/admin/guide/:id` - 获取攻略详情
- `POST /api/admin/guide/:id` - 审核攻略（通过/驳回）

### 用户管理
- `GET /api/admin/users` - 获取用户列表
- `GET /api/admin/users/:id` - 获取用户详情
- `POST /api/admin/users/:id/ban` - 禁用用户
- `POST /api/admin/users/:id/unban` - 解禁用户

### 系统配置
- `GET /api/admin/config` - 获取系统配置
- `PUT /api/admin/config/site` - 更新网站配置
- `POST /api/admin/config/feature/:name` - 切换功能开关

## 更新日志

### 2026-02-08
- 统一后台管理界面风格
- 新增系统配置页面
- 新增用户管理页面
- 优化攻略审核功能
- 优化数据统计模块

## 维护者

- 管理员后台账号: admin

## 许可证

本项目为粉丝制作，与 Project Moon 官方无关。
所有游戏内容版权归 Project Moon 所有。
