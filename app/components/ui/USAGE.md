# 通用AI处理进度组件使用指南

## 🚀 快速开始

### 基础使用

```tsx
import { UniversalProgressCard, AIProcessingProgress } from '@/components/ui'

function MyComponent() {
  const [progress, setProgress] = useState<AIProcessingProgress>({
    current: 0,
    total: 5,
    status: 'idle'
  })

  return (
    <UniversalProgressCard
      progress={progress}
      title="AI处理任务"
      subtitle="正在处理..."
    />
  )
}
```

### 使用预设配置

```tsx
import { createProgressCard, presetConfigs } from '@/components/ui'

// 使用最小配置
const minimalConfig = createProgressCard(progress, 'minimal')

// 使用标准配置并覆盖部分设置
const customConfig = createProgressCard(progress, 'standard', {
  position: 'center',
  theme: 'dark'
})
```

## 📱 响应式设计

组件会自动根据设备类型和屏幕尺寸进行适配：

- **移动端**: 紧凑模式，禁用拖拽，自动关闭
- **平板端**: 平衡模式，适中尺寸
- **桌面端**: 完整功能，详细信息显示

```tsx
// 无需手动配置，组件会自动适配
<UniversalProgressCard
  progress={progress}
  title="AI字幕处理"
  // 组件会根据设备自动选择最佳配置
/>
```

## 🎨 主题和样式

### 主题切换

```tsx
// 自动主题（跟随系统）
<UniversalProgressCard theme="auto" />

// 手动设置主题
<UniversalProgressCard theme="dark" />

// 自定义样式
<UniversalProgressCard
  styles={{
    className: "custom-progress-card",
    cardStyle: { backgroundColor: 'rgba(0,0,0,0.9)' }
  }}
/>
```

### 设计令牌使用

```tsx
import { designTokens } from '@/components/ui'

// 在自定义组件中使用设计令牌
const customStyle = {
  color: designTokens.colors.primary[500],
  borderRadius: designTokens.borderRadius.lg,
  padding: designTokens.spacing[4]
}
```

## 🎬 动画配置

### 基础动画配置

```tsx
<UniversalProgressCard
  animations={{
    entrance: 'bounce',     // 入场动画: bounce, fade, scale, slide
    progress: true,         // 进度条动画
    pulse: true,           // 脉冲效果
    wave: true,            // 波形效果
    glow: false,           // 发光效果
    disabled: false        // 禁用所有动画
  }}
/>
```

### 性能优化动画

组件会自动检测设备性能和用户偏好：

```tsx
// 组件会自动处理以下情况：
// - 低性能设备：简化动画
// - 用户设置了"减少动画"：禁用动画
// - 慢网络：禁用资源密集型动画
```

## 🔧 高级配置

### 完整配置示例

```tsx
<UniversalProgressCard
  progress={progress}
  title="AI视频分析"
  subtitle="智能内容识别"
  position="center"
  size="large"
  theme="auto"
  
  behavior={{
    closable: true,
    minimizable: true,
    draggable: true,
    autoClose: 5000,
    persistPosition: true
  }}
  
  display={{
    showProgressBar: true,
    showStats: true,
    showCurrentTask: true,
    showEstimatedTime: true,
    showResults: true,
    compact: false
  }}
  
  callbacks={{
    onClose: () => console.log('关闭'),
    onMinimize: (minimized) => console.log('最小化:', minimized),
    onRetry: (failedItems) => console.log('重试:', failedItems),
    onItemClick: (item) => console.log('点击项目:', item)
  }}
  
  renderers={{
    renderHeader: (progress) => <CustomHeader progress={progress} />,
    renderStats: (stats) => <CustomStats stats={stats} />
  }}
/>
```

### 自定义渲染器

```tsx
const CustomHeader = ({ progress }) => (
  <div className="flex items-center space-x-2">
    <Brain className="w-5 h-5 text-purple-500" />
    <div>
      <h4 className="font-medium">AI分析进行中</h4>
      <p className="text-xs text-gray-500">
        已处理 {progress.current}/{progress.total} 个项目
      </p>
    </div>
  </div>
)

<UniversalProgressCard
  renderers={{
    renderHeader: CustomHeader
  }}
/>
```

## 🎯 使用场景

### AI字幕处理

```tsx
const [aiSubtitleProgress, setAISubtitleProgress] = useState<AIProcessingProgress>({
  current: 2,
  total: 5,
  status: 'processing',
  currentTask: {
    id: 'video-3',
    title: '正在处理: 产品介绍视频.mp4',
    description: '使用Deepgram AI进行语音识别...'
  },
  stats: {
    successCount: 2,
    errorCount: 0
  }
})

<UniversalProgressCard
  progress={aiSubtitleProgress}
  title="AI字幕生成"
  subtitle="智能语音转文字"
  position="bottom-right"
  callbacks={{
    onRetry: () => retryFailedSubtitles(),
    onClose: () => setAISubtitleProgress({ ...aiSubtitleProgress, status: 'idle' })
  }}
/>
```

### 批量视频分析

```tsx
const [analysisProgress, setAnalysisProgress] = useState<AIProcessingProgress>({
  current: 1,
  total: 10,
  status: 'processing',
  currentTask: {
    id: 'analysis-1',
    title: '场景识别分析',
    description: '正在识别视频中的对象和场景...',
    progress: 75 // 任务内部进度
  },
  stats: {
    successCount: 0,
    errorCount: 0,
    estimatedTimeRemaining: 180000 // 3分钟
  }
})

<UniversalProgressCard
  progress={analysisProgress}
  title="AI视频分析"
  subtitle="智能内容识别"
  size="large"
  display={{
    showEstimatedTime: true,
    showResults: true
  }}
/>
```

## ⌨️ 键盘快捷键

- `Esc`: 关闭进度窗口
- `Ctrl + M`: 切换最小化状态

## 🌐 可访问性

组件完全支持无障碍访问：

- 屏幕阅读器兼容
- 键盘导航支持
- 高对比度模式
- 减少动画偏好支持

## 🔄 状态管理

### 进度状态类型

```typescript
type AIProcessingStatus = 
  | 'idle'          // 空闲
  | 'initializing'  // 初始化
  | 'processing'    // 处理中
  | 'completed'     // 完成
  | 'error'         // 错误
  | 'cancelled'     // 取消
```

### 更新进度

```tsx
// 开始处理
setProgress({
  current: 0,
  total: videos.length,
  status: 'initializing',
  currentTask: {
    id: 'init',
    title: '正在初始化AI模型...'
  }
})

// 处理中
setProgress(prev => ({
  ...prev,
  current: prev.current + 1,
  status: 'processing',
  currentTask: {
    id: currentVideo.id,
    title: currentVideo.title,
    description: '正在进行AI分析...'
  }
}))

// 完成
setProgress(prev => ({
  ...prev,
  status: 'completed',
  currentTask: undefined,
  stats: {
    successCount: successfulVideos.length,
    errorCount: failedVideos.length,
    totalProcessingTime: Date.now() - startTime
  }
}))
```

## 🚨 错误处理

```tsx
// 处理错误
setProgress(prev => ({
  ...prev,
  status: 'error',
  lastError: {
    message: 'AI模型响应超时',
    code: 'TIMEOUT',
    timestamp: new Date(),
    retryable: true
  },
  stats: {
    ...prev.stats,
    errorCount: (prev.stats?.errorCount || 0) + 1
  }
}))
```

## 📊 性能监控

```tsx
// 监控模式 - 适用于长时间运行的任务
<UniversalProgressCard
  progress={longRunningProgress}
  title="批量AI处理"
  position="top-right"
  behavior={{
    closable: false,
    minimizable: true,
    stayOnTop: true
  }}
  display={{
    showStats: true,
    showEstimatedTime: true,
    compact: true
  }}
  animations={{
    progress: false, // 减少CPU使用
    wave: false
  }}
/>
```

## 🔧 故障排除

### 常见问题

1. **组件不显示**: 确保 `progress.status` 不是 `'idle'`
2. **动画卡顿**: 检查是否在低性能设备上，组件会自动优化
3. **响应式问题**: 确保父容器没有限制组件的定位

### 调试技巧

```tsx
// 开启调试模式
<UniversalProgressCard
  progress={progress}
  // 添加调试类名
  styles={{ className: 'debug-progress-card' }}
  // 监听所有回调
  callbacks={{
    onClose: () => console.log('Debug: 组件关闭'),
    onMinimize: (minimized) => console.log('Debug: 最小化状态', minimized),
    onPositionChange: (pos) => console.log('Debug: 位置变化', pos)
  }}
/>
```

## 🎨 自定义主题

```tsx
// 扩展设计令牌
const customTokens = {
  ...designTokens,
  colors: {
    ...designTokens.colors,
    primary: {
      ...designTokens.colors.primary,
      500: '#your-brand-color'
    }
  }
}

// 在自定义组件中使用
const CustomProgressCard = (props) => (
  <UniversalProgressCard
    {...props}
    styles={{
      cardStyle: {
        background: customTokens.colors.primary[500]
      }
    }}
  />
)
```

---

## 📚 API 参考

完整的类型定义请参考 `types.ts` 文件。

## 🤝 贡献

欢迎提交问题和改进建议！请确保遵循项目的代码规范和设计原则。