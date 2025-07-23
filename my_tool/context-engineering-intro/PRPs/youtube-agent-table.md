# YouTube Agent 数据处理与AI增强平台

## 目标
构建一个功能完整的YouTube数据抓取、表格展示和AI批量处理平台，支持单链接、多链接、账号链接三种数据访问方式，提供类似Excel/飞书的多维表格交互体验，并集成AI大模型进行文案增强处理。

## 为什么需要这个功能
- **内容创作者痛点**：需要批量分析和优化YouTube视频数据，手动处理效率低
- **数据驱动决策**：通过数据分析优化视频标题、描述等内容，提升播放量和互动率
- **批量处理需求**：支持大规模视频数据的统一管理和AI批量优化
- **用户体验**：提供直观的表格界面，支持实时编辑、筛选、排序等交互操作

## 功能规格

### 成功标准
- [ ] 支持YouTube单链接、多链接、账号链接三种数据获取方式
- [ ] 实现类似Excel的表格界面，支持排序、筛选、内联编辑
- [ ] 集成AI大模型，支持批量文案增强（标题改写、描述摘要、多语言翻译）
- [ ] 支持数据导出为CSV、Excel、Markdown格式
- [ ] 实现响应式设计，适配移动端
- [ ] 数据临时存储，提醒用户及时下载

## 完整技术上下文

### 文档与参考资料
```yaml
# 必读文档 - 包含在上下文窗口中
- url: https://tanstack.com/table/latest
  section: React Table Guide, API Reference
  why: 实现表格核心功能的官方文档
  critical: 必须了解useReactTable、flexRender、column定义模式

- url: https://developers.google.com/youtube/v3/determine_quota_cost?hl=zh-cn
  section: API Reference, Authentication, Quota Management
  why: YouTube API集成的官方指南
  critical: 了解API配额成本和认证流程

- url: https://ai-sdk.dev/docs/getting-started/nextjs-app-router
  section: Getting Started, Streaming, Multi-provider support
  why: AI Integration的最佳实践框架
  critical: Vercel AI SDK是Next.js AI集成的事实标准

- file: context-engineering-intro/examples/table-main/examples/react/basic/src/main.tsx
  why: TanStack Table基础实现模式
  critical: 理解useReactTable、columns、getCoreRowModel模式

- file: context-engineering-intro/examples/table-main/examples/react/editable-data/src/main.tsx  
  why: 内联编辑功能实现模式
  critical: 必须理解defaultColumn、updateData、meta模式

- file: context-engineering-intro/examples/table-main/examples/react/row-selection/src/main.tsx
  why: 批量选择功能实现模式
  critical: rowSelection状态管理和IndeterminateCheckbox组件

- file: context-engineering-intro/examples/table-main/examples/react/filters-faceted/src/main.tsx
  why: 高级筛选功能实现模式
  critical: columnFilters、getFacetedUniqueValues、DebouncedInput模式

- file: context-engineering-intro/examples/table-main/examples/react/kitchen-sink/src/App.tsx
  why: 综合功能集成模式
  critical: 所有功能的整合方式和状态管理

- docfile: context-engineering-intro/CLAUDE.md
  why: 项目架构规范和模式约定
  critical: 模块化、组件化、工具化的架构原则
```

### 当前代码库结构
```bash
youtube-agent/
├── my_tool/                    # 工具集合目录
│   └── context-engineering-intro/
│       ├── CLAUDE.md          # 架构规范文档
│       ├── examples/          # TanStack Table示例
│       │   └── table-main/
│       │       └── examples/react/
│       │           ├── basic/           # 基础表格实现
│       │           ├── editable-data/   # 内联编辑功能
│       │           ├── row-selection/   # 批量选择功能
│       │           ├── filters-faceted/ # 高级筛选功能
│       │           └── kitchen-sink/    # 综合功能集成
│       └── PRPs/              # 产品需求文档
│           └── templates/
│               └── prp_base.md
```

### 目标代码库结构
```bash
youtube-agent/
├── app/                       # Next.js App Router
│   ├── api/
│   │   ├── youtube/
│   │   │   ├── single/        # 单链接数据获取
│   │   │   ├── multiple/      # 多链接数据获取
│   │   │   └── channel/       # 账号数据获取
│   │   ├── ai/
│   │   │   ├── enhance/       # AI文案增强
│   │   │   └── translate/     # AI翻译服务
│   │   └── export/           # 数据导出服务
│   ├── components/
│   │   ├── youtube-table/     # YouTube数据表格组件
│   │   ├── ai-enhancement/    # AI增强功能组件
│   │   ├── data-input/        # 数据输入组件
│   │   └── export-dialog/     # 导出对话框组件
│   ├── lib/
│   │   ├── youtube-api.ts     # YouTube API客户端
│   │   ├── ai-client.ts       # AI服务客户端
│   │   ├── table-utils.ts     # 表格工具函数
│   │   └── export-utils.ts    # 导出工具函数
│   ├── types/
│   │   ├── youtube.ts         # YouTube数据类型
│   │   ├── table.ts           # 表格相关类型
│   │   └── ai.ts              # AI相关类型
│   └── page.tsx               # 主页面组件
├── .env.example               # 环境变量示例
└── README.md                  # 项目文档
```

### 已知技术难点和库特性
```typescript
// CRITICAL: TanStack Table需要特定的状态管理模式
// 示例：内联编辑需要useSkipper和meta.updateData模式
declare module '@tanstack/react-table' {
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void
  }
}

// CRITICAL: YouTube API有配额限制
// videos.list：1单位/次，channels.list：1单位/次
// 默认配额：10,000单位/天，需要合理规划API调用

// CRITICAL: Vercel AI SDK是Next.js AI集成标准
// 支持流式响应和多提供商（OpenAI、Claude、Google等）
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

// CRITICAL: Next.js 14推荐使用App Router和Server Components
// API Routes应使用Route Handlers模式
```

## 实现蓝图

### 数据模型与结构

创建核心数据模型，确保类型安全和一致性：

```typescript
// types/youtube.ts - YouTube数据类型定义
interface YouTubeVideo {
  id: string                    // 视频ID
  title: string                 // 视频标题
  description: string           // 视频描述
  thumbnail: string             // 封面图URL
  publishedAt: string           // 发布时间
  viewCount: number             // 播放量
  likeCount: number             // 点赞量
  commentCount: number          // 评论量
  duration: string              // 视频时长
  channelTitle: string          // 频道名称
  videoUrl: string              // 视频链接
  // AI增强字段
  enhancedTitle?: string        // AI优化标题
  summarizedDescription?: string // AI摘要描述
  translatedTitle?: string      // AI翻译标题
  isEdited?: boolean            // 编辑状态标记
}

// types/table.ts - 表格相关类型
interface TableState {
  data: YouTubeVideo[]
  selectedRows: Record<string, boolean>
  editingCell: { rowIndex: number; columnId: string } | null
  filters: ColumnFiltersState
  sorting: SortingState
  columnVisibility: VisibilityState
}

// types/ai.ts - AI相关类型  
interface AIEnhancementRequest {
  videos: YouTubeVideo[]
  enhancementType: 'title' | 'description' | 'translate'
  language?: string
  customPrompt?: string
}
```

### 按顺序完成的任务列表

```yaml
任务1 - 项目初始化和YouTube API集成:
  CREATE app/api/youtube/single/route.ts:
    - 实现单个YouTube视频数据获取
    - 使用googleapis库进行API调用
    - 参考模式：Next.js API Routes + YouTube Data API v3
    - 包含错误处理和配额管理

  CREATE app/api/youtube/multiple/route.ts:
    - 实现批量YouTube视频数据获取
    - 支持URL列表解析和并发请求
    - 优化API配额使用效率

  CREATE app/api/youtube/channel/route.ts:
    - 实现YouTube频道视频列表获取
    - 使用channels.list和playlistItems.list API
    - 支持分页和大量数据处理

任务2 - 核心数据表格组件:
  CREATE app/components/youtube-table/YouTubeTable.tsx:
    - 基于TanStack Table实现核心表格组件
    - 参考模式：examples/react/kitchen-sink/src/App.tsx
    - 集成排序、筛选、分页、虚拟化功能
    - 实现列配置和显示/隐藏功能

  CREATE app/components/youtube-table/EditableCell.tsx:
    - 实现内联编辑功能
    - 参考模式：examples/react/editable-data/src/main.tsx
    - 支持短文本内联编辑和长文本弹出编辑
    - 包含编辑状态管理和自动保存

  CREATE app/components/youtube-table/FilterComponents.tsx:
    - 实现高级筛选组件
    - 参考模式：examples/react/filters-faceted/src/main.tsx
    - 支持文本、数值范围、选择器多种筛选类型
    - 包含防抖输入和faceted搜索

任务3 - 数据输入和获取界面:
  CREATE app/components/data-input/VideoUrlInput.tsx:
    - 实现视频URL输入组件
    - 支持单链接输入和多链接批量输入
    - 包含URL验证和解析功能

  CREATE app/components/data-input/ChannelInput.tsx:
    - 实现频道链接输入组件
    - 支持频道URL和频道ID输入
    - 包含频道信息预览功能

  CREATE app/components/data-input/FileUpload.tsx:
    - 实现CSV文件上传功能
    - 支持拖拽上传和文件解析
    - 包含数据验证和错误处理

任务4 - AI增强功能集成:
  CREATE app/api/ai/enhance/route.ts:
    - 集成Vercel AI SDK实现AI增强API
    - 支持标题改写、描述摘要、语言翻译
    - 实现流式响应和批量处理
    - 参考模式：AI SDK Next.js App Router集成

  CREATE app/components/ai-enhancement/EnhancementPanel.tsx:
    - 实现AI增强控制面板
    - 支持批量选择和自定义prompt
    - 包含进度显示和实时预览
    - 集成流式响应展示

  CREATE app/components/ai-enhancement/PromptTemplates.tsx:
    - 实现预设prompt模板管理
    - 支持模板自定义和保存
    - 包含多语言和多场景模板

任务5 - 数据导出功能:
  CREATE app/api/export/route.ts:
    - 实现数据导出API
    - 支持CSV、Excel、Markdown格式
    - 包含字段选择和格式化功能

  CREATE app/components/export-dialog/ExportDialog.tsx:
    - 实现导出对话框组件
    - 支持格式选择和字段配置
    - 包含导出进度和下载功能

任务6 - 主界面和状态管理:
  CREATE app/page.tsx:
    - 实现主页面布局和路由
    - 集成所有功能组件
    - 实现全局状态管理和数据流

  CREATE app/lib/store.ts:
    - 实现全局状态管理（使用Zustand或Context）
    - 管理表格数据、选择状态、编辑状态
    - 包含持久化和恢复功能

任务7 - 工具函数和类型定义:
  CREATE app/lib/youtube-api.ts:
    - 实现YouTube API客户端封装
    - 包含认证、错误处理、配额管理
    - 支持多种数据获取模式

  CREATE app/lib/table-utils.ts:
    - 实现表格相关工具函数
    - 包含数据转换、筛选、排序逻辑
    - 支持导出格式化功能

任务8 - 响应式设计和移动端适配:
  MODIFY 所有组件:
    - 实现响应式布局设计
    - 适配移动端交互模式
    - 优化触摸操作体验
    - 使用Tailwind CSS断点系统
```

### 任务伪代码实现

```typescript
// 任务1: YouTube API集成
// app/api/youtube/single/route.ts
export async function POST(request: Request) {
  // 模式：Next.js App Router API Routes
  const { videoUrl } = await request.json()
  
  // 关键点：使用googleapis库和API密钥认证
  const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY,
  })
  
  // 关键点：调用videos.list API获取详细信息
  const response = await youtube.videos.list({
    part: ['snippet', 'statistics', 'contentDetails'],
    id: [extractVideoId(videoUrl)],
  })
  
  // 关键点：数据转换和错误处理
  return NextResponse.json(transformVideoData(response.data))
}

// 任务2: 核心表格组件
// app/components/youtube-table/YouTubeTable.tsx
export function YouTubeTable({ data }: { data: YouTubeVideo[] }) {
  // 模式：参考kitchen-sink示例的综合功能集成
  const [rowSelection, setRowSelection] = useState({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  
  // 关键点：使用useReactTable进行状态管理
  const table = useReactTable({
    data,
    columns: youtubeColumns, // 预定义的列配置
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    // 关键点：meta对象用于内联编辑
    meta: {
      updateData: (rowIndex, columnId, value) => {
        // 更新数据逻辑
      }
    },
    state: { rowSelection, columnFilters }
  })
  
  // 关键点：使用flexRender渲染表格
  return (
    <table className="table-auto w-full">
      {/* 表头渲染 */}
      {/* 表体渲染 */}
      {/* 分页控件 */}
    </table>
  )
}

// 任务4: AI增强功能
// app/api/ai/enhance/route.ts
export async function POST(request: Request) {
  // 模式：Vercel AI SDK流式响应
  const { videos, enhancementType, customPrompt } = await request.json()
  
  // 关键点：使用streamText实现流式AI响应
  const result = await streamText({
    model: openai('gpt-4o'),
    system: getEnhancementSystemPrompt(enhancementType),
    messages: [
      { role: 'user', content: formatVideosForAI(videos, customPrompt) }
    ],
  })
  
  // 关键点：返回流式响应
  return result.toDataStreamResponse()
}

// 任务6: 主页面集成
// app/page.tsx
export default function HomePage() {
  // 关键点：全局状态管理
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(false)
  
  // 关键点：数据获取和处理流程
  const handleDataFetch = async (input: DataInput) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/youtube/${input.type}`, {
        method: 'POST',
        body: JSON.stringify(input)
      })
      const data = await response.json()
      setVideos(data)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="container mx-auto p-4">
      <DataInputPanel onSubmit={handleDataFetch} />
      {videos.length > 0 && (
        <>
          <YouTubeTable data={videos} />
          <AIEnhancementPanel videos={videos} />
          <ExportPanel videos={videos} />
        </>
      )}
    </div>
  )
}
```

### 集成要点
```yaml
YouTube API集成:
  - 配置：在Google Cloud Console启用YouTube Data API v3
  - 认证：使用API密钥进行服务器端认证
  - 配额：默认10,000单位/天，合理规划API调用

TanStack Table集成:
  - 状态：使用useReactTable管理表格状态
  - 编辑：通过meta.updateData实现内联编辑
  - 筛选：使用getFacetedUniqueValues实现高级筛选
  
AI集成:
  - SDK：使用Vercel AI SDK实现统一接口
  - 流式：使用streamText实现实时响应
  - 批量：支持多个视频同时处理

数据流:
  - 获取：YouTube API → 数据转换 → 状态存储
  - 展示：TanStack Table → 内联编辑 → 状态更新
  - 增强：AI API → 流式响应 → 实时更新
  - 导出：数据格式化 → 文件生成 → 下载
```

## 验证循环

### 第一级：语法与样式
```bash
# 优先运行 - 修复所有错误后再继续
npm run lint              # ESLint语法检查
npm run type-check        # TypeScript类型检查
npm run format            # Prettier代码格式化

# 预期：无错误。如有错误，阅读错误信息并修复
```

### 第二级：单元测试
```typescript
// 创建测试文件使用现有测试模式
// __tests__/youtube-api.test.ts
describe('YouTube API Integration', () => {
  test('should fetch single video data', async () => {
    const videoData = await fetchSingleVideo('test-video-url')
    expect(videoData).toHaveProperty('title')
    expect(videoData).toHaveProperty('viewCount')
  })
  
  test('should handle API errors gracefully', async () => {
    await expect(fetchSingleVideo('invalid-url'))
      .rejects.toThrow('Invalid video URL')
  })
})

// __tests__/table-functionality.test.ts
describe('Table Functionality', () => {
  test('should render video data correctly', () => {
    render(<YouTubeTable data={mockVideoData} />)
    expect(screen.getByText('Test Video Title')).toBeInTheDocument()
  })
  
  test('should handle inline editing', async () => {
    render(<YouTubeTable data={mockVideoData} />)
    const titleCell = screen.getByDisplayValue('Test Video Title')
    fireEvent.change(titleCell, { target: { value: 'New Title' } })
    fireEvent.blur(titleCell)
    
    await waitFor(() => {
      expect(mockUpdateData).toHaveBeenCalledWith(0, 'title', 'New Title')
    })
  })
})
```

```bash
# 运行并迭代直到通过
npm test
# 如失败：阅读错误，理解根本原因，修复代码，重新运行（不要mock掉错误）
```

### 第三级：集成测试
```bash
# 启动开发服务器
npm run dev

# 测试YouTube数据获取
curl -X POST http://localhost:3000/api/youtube/single \
  -H "Content-Type: application/json" \
  -d '{"videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

# 预期：{"title": "...", "viewCount": ..., "thumbnail": "..."}

# 测试AI增强功能
curl -X POST http://localhost:3000/api/ai/enhance \
  -H "Content-Type: application/json" \
  -d '{"videos": [...], "enhancementType": "title"}'

# 预期：流式响应数据
# 如错误：检查logs/app.log获取详细错误信息
```

## 最终验证清单
- [ ] 所有测试通过：`npm test`
- [ ] 无语法错误：`npm run lint`
- [ ] 无类型错误：`npm run type-check`
- [ ] 手动测试成功：YouTube数据获取正常
- [ ] AI功能正常：能够增强视频标题和描述
- [ ] 表格交互正常：排序、筛选、编辑功能工作
- [ ] 数据导出功能：能够导出为多种格式
- [ ] 响应式设计：移动端体验良好
- [ ] 错误处理完善：优雅处理API限制和网络错误
- [ ] 日志信息有用：便于调试但不冗余
- [ ] 环境配置完整：.env.example和README更新

---

## 反模式避免
- ❌ 不要在YouTube API达到配额时继续调用
- ❌ 不要在AI流式响应时阻塞UI界面
- ❌ 不要忽略TanStack Table的状态管理模式
- ❌ 不要在异步上下文中使用同步函数
- ❌ 不要硬编码API密钥和配置值
- ❌ 不要捕获所有异常 - 要具体处理特定错误类型

## 实现信心评级

**评分：9/10** - 一次性实现成功的信心等级

**理由：**
- ✅ 完整的技术上下文和示例代码参考
- ✅ 清晰的实现路径和任务分解
- ✅ 充分的错误处理和验证策略
- ✅ 基于成熟库（TanStack Table、Vercel AI SDK）的稳定技术栈
- ✅ 详细的集成模式和最佳实践指导

**风险点：**
- YouTube API配额管理需要细心处理
- 大量数据的表格渲染性能优化

记住：目标是通过全面的上下文实现一次性成功的实现。