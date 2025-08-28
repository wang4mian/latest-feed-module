# 制造业情报系统 - 常见问题 (FAQ)

## 🚀 部署相关问题

### Q1: Vercel 部署时出现运行时错误 "Function Runtimes must have a valid version" 

**问题描述：**
```
Error: The following Serverless Functions contain an invalid "runtime":
  - _render (nodejs18.x). Learn More: https://vercel.com/docs/functions/runtimes#official-runtimes

Error: Function Runtimes must have a valid version, for example `now-php@1.0.0`.
```

**根本原因：**
1. **版本兼容性问题** - 旧版本的 Astro (v4) 与 Vercel 适配器 (v7) 存在运行时配置冲突
2. **不必要的手动配置** - Vercel 对 Node.js 的支持是自动的，不需要在 `vercel.json` 中手动指定运行时
3. **过时的运行时格式** - 旧版本适配器使用了 Vercel 不再支持的运行时格式

**解决方案：**

1. **更新到最新版本**
```bash
# 强制更新到最新版本
npm install astro@latest @astrojs/vercel@latest --force
```

2. **修复弃用的导入**
```javascript
// astro.config.mjs - 修改前
import vercel from '@astrojs/vercel/serverless';

// astro.config.mjs - 修改后  
import vercel from '@astrojs/vercel';
```

3. **简化 vercel.json 配置**
```json
{
  "crons": [
    {
      "path": "/api/rss-cron",
      "schedule": "0 */2 * * *"
    },
    {
      "path": "/api/job-processor-cron", 
      "schedule": "*/15 * * * *"
    }
  ]
}
```

4. **移除 package.json 中的 engines 字段**
```json
{
  "name": "manufacturing-intelligence",
  "type": "module", 
  "version": "0.0.1",
  // 删除这个字段，让 Vercel 自动检测
  // "engines": {
  //   "node": ">=18.0.0"  
  // },
  "scripts": {
    // ...
  }
}
```

**验证解决方案：**
```bash
# 本地测试构建
npm run build

# 应该看到类似输出，无错误和警告：
# [build] adapter: @astrojs/vercel
# [@astrojs/vercel] Bundling function ../../../../dist/server/entry.mjs
# [build] Complete!
```

**成功标志：**
- ✅ Astro 更新到 v5.13.4+
- ✅ Vercel 适配器更新到 v8.2.6+ 
- ✅ 本地构建无警告
- ✅ Vercel 部署成功，无运行时错误
- ✅ 定时任务正常配置

---

## ❌ 部署后显示 HTTP ERROR 500

**问题描述：**
Vercel 部署成功，但访问主页显示 "HTTP ERROR 500" 内部服务器错误。

**根本原因：**
Supabase 环境变量未在 Vercel 项目中配置，导致数据库连接失败。

**诊断方法：**
1. 访问 `/health` 页面查看环境变量状态
2. 如果显示 "❌ 未配置"，说明需要在 Vercel 中配置环境变量

**解决方案：**
1. **进入 Vercel 项目设置**：
   - 访问 https://vercel.com/dashboard
   - 点击项目名称 → Settings → Environment Variables

2. **添加必需的环境变量**：
   ```
   PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGc...
   ```

3. **可选环境变量**（用于高级功能）：
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGc...
   GEMINI_API_KEY=AIzaSyC...
   CRON_SECRET=123456
   ```

4. **重新部署**：
   - 在 Deployments 页面找到最新部署
   - 点击三个点菜单 → Redeploy

**验证修复：**
- 访问 `/health` 页面应该显示 "✅ 已配置"
- 主页应该正常显示，不再出现 500 错误

---

## 🔧 开发环境问题

### Q2: RSS 源 ID 无法修改

**问题：** 用户想修改 RSS 源表中的 ID 字段

**回答：** 
数据库中的 `id` 字段通常是主键（PRIMARY KEY），由数据库自动管理，不建议手动修改。原因：
- 可能破坏外键关系
- 影响关联数据的完整性  
- 数据库最佳实践不推荐修改主键

**建议：** 保持 ID 自动生成，通过 `name` 字段来识别和管理不同的 RSS 源。

---

## 📝 系统使用问题

### Q3: 如何验证系统是否正常工作？

**检查步骤：**

1. **访问主页面**
   - 打开部署的 Vercel 网址
   - 确认页面能正常加载

2. **检查 RSS 源管理**
   - 访问 `/sources` 页面
   - 确认能添加、编辑、删除 RSS 源

3. **验证定时任务**
   - 查看 Vercel 仪表板的 Functions 页面
   - 确认 cron 任务已配置且无错误

4. **测试数据流程**
   - 添加一个测试 RSS 源
   - 等待自动抓取执行
   - 检查文章池页面是否有新文章

---

## 🚨 故障排查

### 通用排查步骤

1. **检查环境变量**
```bash
# 确认必需的环境变量已配置
PUBLIC_SUPABASE_URL
PUBLIC_SUPABASE_ANON_KEY  
SUPABASE_SERVICE_ROLE_KEY
```

2. **查看部署日志**
   - 登录 Vercel 仪表板
   - 查看最新部署的日志输出
   - 关注 ERROR 和 WARNING 信息

3. **测试数据库连接**
   - 确认 Supabase 项目正常运行
   - 检查数据库表是否正确创建
   - 验证 API 密钥权限

4. **本地调试**
```bash
# 本地开发模式
npm run dev

# 本地构建测试
npm run build
```

---

## 📚 相关文档

- [Vercel Functions 文档](https://vercel.com/docs/functions)
- [Astro 部署指南](https://docs.astro.build/en/guides/deploy/vercel/)
- [Supabase JavaScript 客户端](https://supabase.com/docs/reference/javascript)

---

## 🆘 获取帮助

如果遇到本文档未覆盖的问题：

1. 查看项目的 `CLAUDE.md` 文件了解系统架构
2. 检查 GitHub Issues (如果有开源仓库)
3. 联系系统管理员或开发团队

---

*最后更新：2025-08-28*