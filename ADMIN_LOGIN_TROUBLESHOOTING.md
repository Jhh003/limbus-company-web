# 管理员登录系统故障排查指南

## 问题描述
自定义域名 `https://084limbus.xyz/` 无法登录管理员后台，但默认域名 `https://limbus-72b.pages.dev/` 可以正常登录。

---

## 系统性排查流程

### 第一阶段：客户端排查

#### 1. 浏览器控制台检查
**操作步骤：**
1. 打开 `https://084limbus.xyz/admin-login.html`
2. 按 `F12` 打开开发者工具
3. 切换到 Console 标签
4. 尝试登录，观察错误信息

**常见问题：**
- `Failed to fetch` - 网络连接问题
- `CORS error` - 跨域问题
- `404 Not Found` - API 路径问题
- `500 Internal Server Error` - 服务器错误

#### 2. Network 标签检查
**操作步骤：**
1. 切换到 Network 标签
2. 清除现有记录（点击 🚫 按钮）
3. 尝试登录
4. 检查 `/api/captcha` 和 `/api/admin/login` 请求

**检查要点：**
- 请求 URL 是否正确
- 状态码（200/404/500等）
- 请求头和响应头
- 响应内容

#### 3. 验证码加载检查
**操作步骤：**
1. 刷新页面
2. 检查验证码图片是否显示
3. 点击验证码图片看是否能刷新

**预期结果：**
- 验证码图片正常显示
- 点击能刷新验证码
- 浏览器控制台无错误

---

### 第二阶段：API 接口测试

#### 1. 测试验证码 API
```bash
# 测试自定义域名
curl -X GET https://084limbus.xyz/api/captcha

# 测试默认域名
curl -X GET https://limbus-72b.pages.dev/api/captcha
```

**预期响应：**
```json
{
  "code": 200,
  "message": "验证码生成成功",
  "data": {
    "captchaId": "uuid-string",
    "captchaImage": "data:image/svg+xml;base64,..."
  }
}
```

#### 2. 测试登录 API
```bash
# 测试登录（使用正确的验证码ID）
curl -X POST https://084limbus.xyz/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-password",
    "captchaId": "your-captcha-id",
    "captchaText": "ABCD"
  }'
```

---

### 第三阶段：服务器端排查

#### 1. Cloudflare Pages 配置检查
**检查项目：**
- [ ] 自定义域名 DNS 配置正确
- [ ] SSL/TLS 证书有效
- [ ] 构建输出目录正确
- [ ] Functions 路由配置正确

#### 2. D1 数据库检查
**检查管理员账号是否存在：**
```sql
SELECT * FROM admins WHERE username = 'admin';
```

**检查账号状态：**
```sql
SELECT username, status, role, last_login_at FROM admins;
```

#### 3. KV 存储检查
**检查验证码存储：**
- 确认 `CAPTCHA_KV` 命名空间已绑定
- 检查验证码是否正确存储

---

## 可能原因及解决方案

### 原因 1：API 路径路由问题
**症状：** 404 错误
**解决方案：**
已更新 `_routes.json` 文件，确保 API 路由正确转发。

### 原因 2：CORS 跨域问题
**症状：** CORS error
**解决方案：**
已在 API 代码中设置 `Access-Control-Allow-Origin: *`

### 原因 3：验证码服务故障
**症状：** 验证码无法加载
**解决方案：**
1. 检查 `CAPTCHA_KV` 是否配置
2. 检查验证码生成代码

### 原因 4：数据库连接问题
**症状：** 500 错误，提示数据库错误
**解决方案：**
1. 检查 D1 数据库绑定
2. 检查管理员账号是否存在

### 原因 5：自定义域名缓存问题
**症状：** 默认域名正常，自定义域名异常
**解决方案：**
1. 清除 Cloudflare 缓存
2. 清除浏览器缓存
3. 等待 DNS 传播

---

## 修复步骤

### 步骤 1：更新路由配置
已更新 `_routes.json`：
```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": [],
  "routes": [
    {
      "src": "/api/*",
      "dest": "/api/$1"
    }
  ]
}
```

### 步骤 2：检查管理员账号
如果数据库中没有管理员账号，需要创建：

```javascript
// 在 Cloudflare Dashboard 的 D1 控制台执行
INSERT INTO admins (username, password, role, status, created_at) 
VALUES ('admin', 'SHA256_HASH_HERE', 'superadmin', 'active', datetime('now'));
```

**生成密码哈希：**
```javascript
// 使用 SHA-256 哈希
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### 步骤 3：清除缓存
1. **Cloudflare 缓存：**
   - 进入 Cloudflare Dashboard
   - Caching > Configuration > Purge Everything

2. **浏览器缓存：**
   - 按 `Ctrl+F5` 强制刷新
   - 或清除浏览器缓存

---

## 验证方法

### 验证 1：验证码功能
1. 访问 `https://084limbus.xyz/admin-login.html`
2. 确认验证码图片正常显示
3. 点击验证码能刷新

### 验证 2：登录功能
1. 输入正确的管理员账号和密码
2. 输入验证码
3. 点击登录
4. 确认跳转到管理后台

### 验证 3：API 测试
```bash
# 测试验证码 API
curl https://084limbus.xyz/api/captcha

# 测试健康检查
curl https://084limbus.xyz/api/health
```

---

## 成功标准

- [ ] 验证码图片正常加载
- [ ] 能够使用正确的账号密码登录
- [ ] 登录后跳转到管理后台
- [ ] 所有管理功能正常使用

---

## 紧急联系方式

如果以上步骤都无法解决问题，请检查：
1. Cloudflare Pages 部署日志
2. Functions 调用日志
3. D1 数据库查询日志
