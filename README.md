# YouTube数据处理与AI增强平台

一个基于Next.js 14构建的现代化YouTube数据处理和AI增强平台，支持视频数据抓取、智能表格操作、AI内容优化和多格式数据导出功能。

## ✨ 功能特性

### 🎯 核心功能
- **多种数据获取方式**：支持单个视频、批量视频、频道视频数据抓取
- **智能数据表格**：类似Excel的交互体验，支持排序、筛选、内联编辑
- **AI内容增强**：标题优化、描述摘要、多语言翻译、关键词提取
- **数据导出**：支持CSV、JSON、Excel等多种格式导出

### 🚀 技术特色
- **现代化架构**：Next.js 14 + App Router + TypeScript
- **高性能表格**：基于TanStack Table的虚拟化表格组件
- **AI集成**：支持OpenAI和Anthropic多种AI服务
- **响应式设计**：完美支持桌面端和移动端
- **状态管理**：使用Zustand进行轻量级状态管理

## 🛠️ 技术栈

### 前端框架
- **Next.js 14** - React全栈框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 原子化CSS框架

### 核心库
- **@tanstack/react-table** - 高性能数据表格
- **zustand** - 状态管理
- **papaparse** - CSV数据处理

### AI & API
- **Vercel AI SDK** - AI服务集成
- **Google APIs** - YouTube Data API v3
- **OpenAI/Anthropic** - AI内容生成

## 📦 快速开始

### 环境要求
- Node.js 18.0 或更高版本
- npm 或 yarn 包管理器

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd youtube-agent
```

2. **安装依赖**
```bash
npm install
# 或
yarn install
```

3. **配置环境变量**
```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，配置必需的API密钥：
```env
YOUTUBE_API_KEY=your_youtube_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

4. **启动开发服务器**
```bash
npm run dev
# 或
yarn dev
```

5. **访问应用**
打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 🔧 API密钥获取

### YouTube Data API v3
1. 访问 [Google Cloud Console](https://console.developers.google.com/)
2. 创建新项目或选择现有项目
3. 启用YouTube Data API v3
4. 创建API密钥
5. 设置API密钥的访问限制（推荐）

### OpenAI API
1. 访问 [OpenAI Platform](https://platform.openai.com/api-keys)
2. 登录或注册账户
3. 创建新的API密钥
4. 复制密钥到环境变量

## 📖 使用指南

### 数据获取
1. **单个视频**：输入YouTube视频链接获取单个视频数据
2. **批量视频**：输入多个视频链接进行批量处理
3. **频道视频**：输入频道链接获取频道下的所有视频

### 数据操作
- **表格编辑**：双击单元格进行内联编辑
- **筛选排序**：使用表头的筛选器和排序功能
- **批量选择**：使用复选框选择多个视频进行批量操作

### AI增强功能
1. 选择需要处理的视频（使用复选框）
2. 点击"AI增强"按钮
3. 选择增强类型：
   - **标题优化**：生成更吸引人的标题
   - **描述摘要**：将长描述精炼成摘要
   - **标题翻译**：翻译成其他语言
   - **关键词提取**：提取SEO关键词
4. 配置增强选项并执行
5. 预览并应用结果

### 数据导出
1. 点击"导出数据"按钮
2. 选择导出格式（CSV/JSON/Excel）
3. 选择要导出的字段
4. 配置导出选项
5. 下载生成的文件

## 🏗️ 项目结构

```
youtube-agent/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API路由
│   │   ├── youtube/       # YouTube数据API
│   │   ├── ai/           # AI增强API
│   │   └── export/       # 数据导出API
│   ├── components/        # React组件
│   │   ├── data-input/   # 数据输入组件
│   │   ├── youtube-table/ # 表格组件
│   │   ├── ai-enhancement/ # AI增强组件
│   │   └── export-dialog/ # 导出对话框
│   ├── lib/              # 工具库
│   ├── store/            # 状态管理
│   ├── types/            # TypeScript类型定义
│   └── page.tsx          # 主页面
├── public/               # 静态资源
├── .env.example         # 环境变量示例
├── package.json         # 项目配置
└── README.md           # 项目说明
```

## 🧪 开发脚本

```bash
# 开发模式
npm run dev

# 构建项目
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint

# 类型检查
npm run type-check

# 代码格式化
npm run format

# 运行测试
npm run test
```

## 🔒 环境变量说明

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `YOUTUBE_API_KEY` | ✅ | YouTube Data API v3密钥 |
| `OPENAI_API_KEY` | ✅ | OpenAI API密钥 |
| `ANTHROPIC_API_KEY` | ❌ | Anthropic API密钥（可选） |
| `NODE_ENV` | ✅ | 运行环境（development/production） |
| `NEXT_PUBLIC_APP_URL` | ✅ | 应用URL |

## 📊 API限制说明

### YouTube Data API v3
- **配额限制**：每日10,000单位（免费层）
- **请求限制**：每100秒100个请求
- **数据限制**：单次最多50个项目

### OpenAI API
- **Token限制**：根据选择的模型而定
- **频率限制**：根据账户等级而定
- **成本**：按Token使用量计费

## 🚀 部署指南

### Vercel部署（推荐）
1. 将代码推送到Git仓库
2. 在[Vercel](https://vercel.com)导入项目
3. 配置环境变量
4. 自动部署完成

### 其他平台
项目支持部署到任何支持Next.js的平台：
- Netlify
- Railway
- Heroku
- AWS
- Google Cloud Platform

## 🐛 故障排除

### 常见问题

**Q: YouTube API配额不足怎么办？**
A: 可以申请配额增加，或者在Google Cloud Console启用计费。

**Q: AI功能不工作？**
A: 检查OpenAI API密钥是否正确配置，确保账户有足够余额。

**Q: 表格数据不显示？**
A: 检查网络连接和API密钥配置，查看浏览器控制台错误信息。

**Q: 导出功能失败？**
A: 确保选择了要导出的数据，检查浏览器是否阻止了下载。

## 🤝 贡献指南

我们欢迎各种形式的贡献！

1. Fork项目
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交Pull Request

## 📄 许可证

本项目采用MIT许可证。详见[LICENSE](LICENSE)文件。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React全栈框架
- [TanStack Table](https://tanstack.com/table) - 高性能表格组件
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [Vercel AI SDK](https://sdk.vercel.ai/) - AI集成SDK
- [YouTube Data API](https://developers.google.com/youtube/v3) - YouTube数据接口

## 📞 支持与反馈

如果您在使用过程中遇到问题或有改进建议，请：

1. 查看[FAQ](#-故障排除)
2. 搜索现有的[Issues](https://github.com/your-repo/issues)
3. 创建新的Issue描述问题
4. 通过邮件联系：your-email@example.com

---

## 📝 更新日志

### 2025-07-24
- **修复数据混淆问题**：解决了视频链接请求时显示之前账号链接数据的问题
- **新增数据处理模式**：添加"替换数据"和"追加数据"两种模式选择
  - 替换数据：清除旧数据，只显示当前请求的数据（默认模式）
  - 追加数据：在现有数据基础上添加新数据
- **优化用户体验**：当有现有数据时，用户可以选择数据处理模式

### 修复内容
- `app/page.tsx`: 修改数据获取逻辑，默认替换而不是追加数据
- `app/page.tsx`: 添加数据处理模式选择器UI组件
- 确保每次新请求只显示对应的数据，避免数据混淆

---

⭐ 如果这个项目对您有帮助，请给我们一个Star！