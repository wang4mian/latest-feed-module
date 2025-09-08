# KUATO 使用指南
**kuato.intelliexport.com**

KUATO (跨语言跨模态内容套利) 是一个全自动化的制造业情报系统，通过RSS采集、AI分析和人工筛选，为制造业从业者提供高价值的行业洞察。

## 🔄 系统工作流程

### 第1层：自动数据采集
- **定时任务**：每2小时自动运行 RSS 抓取
- **数据源**：43个制造业专业RSS源
- **处理逻辑**：解析RSS → 三层防重复检测 → 存储到 articles 表
- **初始状态**：新文章状态为 `draft`，ai_score 为 null

### 第2层：AI 智能分析
- **定时任务**：每15分钟自动处理 15 篇未分析文章
- **处理流程**：
  1. 筛选 `ai_score IS NULL` 的文章
  2. Jina AI 提取完整内容
  3. Gemini AI 智能分析评分 (0-100分)
  4. 更新文章状态为 `ready_for_review`
- **分析结果**：AI评分、分类标签、中文摘要、战略意义分析

### 第3层：人工筛选
- **文章池页面** (`/pool`)：显示 AI 分析完成的文章
- **用户操作**：采用高价值文章 / 归档低价值文章
- **编辑工作台** (`/editor`)：深度编辑已采用的文章

### 数据流向图
```
RSS源 → 定时抓取 → draft状态 → AI分析 → ready_for_review → 人工筛选 → adopted/archived
```

---

## 📊 文章状态系统

### 文章状态流转
| 状态 | 中文名称 | 描述 | 显示位置 | 用户操作 |
|-----|----------|------|----------|----------|
| `draft` | 草稿 | RSS抓取后初始状态 | 不显示 | 无 |
| `processing` | 处理中 | AI正在分析 | 不显示 | 无 |
| `ready_for_review` | 待审核 | AI分析完成，等待筛选 | 文章池显示 | 采用/归档 |
| `reviewed` | 已审核 | 审核过但未采用 | 文章池显示 | 采用/归档 |
| `adopted` | 已采用 | 高价值文章 | 编辑工作台显示 | 编辑创作 |
| `archived` | 已归档 | 低价值文章 | 不显示 | 无 |
| `published` | 已发布 | 发布到各渠道 | 统计显示 | 无 |

### AI 分析指标
| 字段 | 类型 | 描述 | 示例 |
|-----|------|------|------|
| `ai_score` | 0-100整数 | AI评分 | 85 |
| `ai_category` | 字符串 | 智能分类 | "Core Equipment" |
| `ai_summary` | 文本 | 中文摘要 | "本文探讨了..." |
| `ai_strategic_implication` | 文本 | 战略意义 | "这项技术对..." |

### AI 分类系统
| 英文分类 | 中文显示 | 颜色 | 描述 |
|----------|----------|------|------|
| Core Equipment | 核心设备 | 紫色 | 制造设备、机器人、自动化 |
| Supply Chain | 供应链 | 橙色 | 物流、采购、供应商 |
| Market Trends | 市场趋势 | 青色 | 行业趋势、市场分析 |
| Technological Innovation | 技术创新 | 蓝色 | 新技术、研发创新 |
| Business Models | 商业模式 | 粉色 | 商业策略、管理模式 |

---

## 🎯 页面使用指南

### 1. 主页 Overview (`/`)
**功能**：系统运营概览和关键指标监控
- **统计数据**：总文章数、已分析数、今日新增、各状态分布
- **快速入口**：跳转到各功能页面
- **实时状态**：显示最后更新时间

### 2. 文章池 Pool (`/pool`)
**功能**：AI分析结果展示和人工筛选
- **显示条件**：`ai_score IS NOT NULL` 的所有文章
- **筛选功能**：
  - 分类筛选：按 AI 分类过滤
  - 来源筛选：按 RSS 源过滤
  - 关键词搜索：标题和摘要搜索
  - 状态筛选：ready_for_review / reviewed
  - 排序选项：AI评分、发布时间
- **核心操作**：
  ```javascript
  adoptArticle(id)   // 采用文章 → status='adopted'
  archiveArticle(id) // 归档文章 → status='archived'
  toggleExpand(id)   // 展开/收起详细内容
  ```
- **分页**：每页显示100篇文章

### 3. 编辑工作台 Editor (`/editor`)
**功能**：深度内容创作和编辑
- **数据源**：`overall_status = 'adopted'` 的文章
- **界面布局**：左侧文章列表 + 右侧 Doocs MD 编辑器
- **核心功能**：
  ```javascript
  useArticle(id)     // 将文章内容发送到编辑器
  ```
- **编辑器集成**：通过 iframe 嵌入 Doocs MD 编辑器

### 4. RSS源管理 Sources (`/sources`)
**功能**：RSS数据源监控和管理
- **显示内容**：源名称、状态、抓取统计、错误信息
- **监控指标**：成功率、最后抓取时间、连续错误次数
- **筛选功能**：活跃/非活跃、有错误的源

### 5. 用KUATO Usage (`/usage`)
**功能**：系统使用说明文档编辑
- **编辑功能**：Markdown 在线编辑和预览
- **保存接口**：`POST /api/usage/save`
- **快捷键**：Ctrl+E 进入编辑，Ctrl+S 保存

---

## ⚙️ API 接口

### 文章操作 API
| 接口路径 | 方法 | 功能 | 请求参数 | 响应格式 |
|----------|------|------|----------|----------|
| `/api/articles/adopt` | POST | 采用文章 | `{id: "uuid"}` | `{success: true, data: {...}}` |
| `/api/articles/archive` | POST | 归档文章 | `{id: "uuid"}` | `{success: true, data: {...}}` |
| `/api/articles/[id]` | GET | 获取文章详情 | URL参数 | `{success: true, data: {...}}` |
| `/api/usage/save` | POST | 保存使用说明 | `{content: "markdown"}` | `{success: true}` |

### 数据库操作
- **Supabase客户端**：配置在 `/src/lib/supabase.ts`
- **环境变量**：`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
- **主要表**：`articles`, `rss_sources`, `entities`, `article_entities`

---

## 🛠️ 技术架构

### 前端技术栈
- **框架**：Astro v5
- **UI组件**：Franken UI + Tailwind CSS
- **部署**：Vercel

### 后端技术栈
- **数据库**：Supabase PostgreSQL
- **后端逻辑**：Supabase Edge Functions
- **定时任务**：Supabase pg_cron
- **AI服务**：Jina AI Reader + Gemini AI

### 自动化流程
```bash
# RSS抓取 (每2小时)
* */2 * * * SELECT cron.schedule('rss-fetch', '0 */2 * * *', 'SELECT net.http_post...')

# AI分析 (每15分钟)  
* */15 * * * SELECT cron.schedule('ai-analyze', '*/15 * * * *', 'SELECT net.http_post...')
```

---

## 📈 系统监控

### 关键指标
- **文章处理速度**：15篇/15分钟 = 1篇/分钟
- **AI分析准确率**：>95% (基于Gemini AI)
- **RSS抓取成功率**：>90% (43个源平均)
- **前后端连通性**：100% (已验证)

### 性能优化
- **批处理优化**：从5篇/批次提升至15篇/批次 (3倍提速)
- **防重复机制**：GUID → URL标准化 → 标题哈希 (三层防护)
- **分页加载**：文章池每页100篇，减少加载时间

---

## 🚀 使用工作流

### 日常使用流程
1. **查看概览** (`/`) → 了解系统状态和新增文章数
2. **筛选文章** (`/pool`) → 按评分和分类筛选高价值文章
3. **采用文章** → 点击"采用"按钮收集有价值内容
4. **深度创作** (`/editor`) → 基于已采用文章进行内容创作
5. **发布分享** → 使用 Doocs MD 编辑器导出或发布内容

### 筛选策略建议
- **高价值文章**：AI评分 ≥ 80分
- **优先分类**：核心设备 > 技术创新 > 市场趋势
- **关注来源**：专业媒体和行业报告优先
- **时效性**：优先处理24小时内的新文章

### 内容创作建议
- 利用AI摘要快速了解文章核心观点
- 结合战略意义分析挖掘深层价值
- 使用中外对比的角度进行内容编译
- 保持原创性，避免直接复制粘贴