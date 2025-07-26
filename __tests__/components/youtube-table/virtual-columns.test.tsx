/**
 * 虚拟列AI草稿功能测试
 * 测试范围：
 * 1. 选中行识别逻辑
 * 2. 虚拟列草稿显示
 * 3. 批量操作（全部接受、逐行接受、撤销）
 * 4. 提交落库逻辑
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { YouTubeTable } from '@/app/components/youtube-table/YouTubeTable'
import { UnifiedDataItem } from '@/types'

// Mock数据
const mockData: UnifiedDataItem[] = []
const mockDataItems: UnifiedDataItem[] = [
  {
    id: '1',
    title: '测试视频1',
    channelTitle: '测试频道',
    publishedAt: '2024-01-01',
    thumbnail: 'https://example.com/thumb1.jpg',
    videoUrl: 'https://youtube.com/watch?v=test1',
    viewCount: 1000,
    likeCount: 100,
    duration: '10:30',
    description: '这是测试视频1的描述',
    originalData: '',
    category: '测试',
    tags: [],
    status: 'active',
  },
  {
    id: '2', 
    title: '测试视频2',
    channelTitle: '测试频道',
    publishedAt: '2024-01-02',
    thumbnail: 'https://example.com/thumb2.jpg',
    videoUrl: 'https://youtube.com/watch?v=test2',
    viewCount: 2000,
    likeCount: 200,
    duration: '15:45',
    description: '这是测试视频2的描述',
    originalData: '',
    category: '测试',
    tags: [],
    status: 'active',
  },
  {
    id: '3',
    title: '测试视频3', 
    channelTitle: '测试频道',
    publishedAt: '2024-01-03',
    thumbnail: 'https://example.com/thumb3.jpg',
    videoUrl: 'https://youtube.com/watch?v=test3',
    viewCount: 3000,
    likeCount: 300,
    duration: '20:15',
    description: '这是测试视频3的描述',
    originalData: '',
    category: '测试',  
    tags: [],
    status: 'active',
  }
]

// Mock AI批处理Hook
const mockStartBatch = vi.fn()
const mockRetryFailedItems = vi.fn()
const mockCancelBatch = vi.fn()
const mockClearResults = vi.fn()
const mockGetNewColumnKey = vi.fn()
const mockCommitVirtualColumn = vi.fn()
const mockAcceptSingleRow = vi.fn()
const mockRejectVirtualColumn = vi.fn()

vi.mock('@/app/hooks/useAIBatch', () => ({
  useAIBatch: () => ({
    batchState: {
      status: 'idle',
      progress: null,
      results: new Map(),
      failedItems: [],
      jobId: null,
      isVirtualColumn: false, // 新增：标识是否为虚拟列模式
      virtualColumnData: new Map(), // 新增：虚拟列数据存储
    },
    startBatch: mockStartBatch,
    retryFailedItems: mockRetryFailedItems,
    cancelBatch: mockCancelBatch,
    clearResults: mockClearResults,
    getNewColumnKey: mockGetNewColumnKey,
    getFailedItemsData: vi.fn(),
    // 新增虚拟列相关方法
    commitVirtualColumn: mockCommitVirtualColumn,
    acceptSingleRow: mockAcceptSingleRow,
    rejectVirtualColumn: mockRejectVirtualColumn,
  }),
  BatchStatus: {
    IDLE: 'idle',
    RUNNING: 'running', 
    COMPLETED: 'completed',
    FAILED: 'failed',
  }
}))

describe('YouTubeTable - 虚拟列AI草稿功能', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('选中行识别逻辑', () => {
    it('应该在点击列头⚡时正确识别选中行数量', async () => {
      const { container } = render(
        <YouTubeTable data={mockDataItems} />
      )

      // 选中前两行
      const checkboxes = container.querySelectorAll('input[type="checkbox"]')
      fireEvent.click(checkboxes[1]!) // 第一行
      fireEvent.click(checkboxes[2]!) // 第二行

      // 点击标题列的⚡按钮
      const lightningButton = screen.getByTitle('AI批处理此列')
      fireEvent.click(lightningButton)

      // 应该显示选中行数量为2行的提示
      await waitFor(() => {
        expect(screen.getByText(/2 行/)).toBeInTheDocument()
      })
    })

    it('应该在无选中行时提示将处理全表数据', async () => {
      render(<YouTubeTable data={mockDataItems} />)

      // 点击标题列的⚡按钮（未选中任何行）
      const lightningButton = screen.getByTitle('AI批处理此列')
      fireEvent.click(lightningButton)

      // 应该显示全表行数的提示
      await waitFor(() => {
        expect(screen.getByText(/3 行/)).toBeInTheDocument()
        expect(screen.getByText(/全表/)).toBeInTheDocument()
      })
    })

    it('应该在有筛选条件时正确计算筛选结果行数', async () => {
      render(<YouTubeTable data={mockDataItems} />)

      // 设置筛选条件
      const titleFilter = screen.getByPlaceholderText('筛选标题...')
      fireEvent.change(titleFilter, { target: { value: '测试视频1' } })

      // 点击标题列的⚡按钮
      const lightningButton = screen.getByTitle('AI批处理此列')
      fireEvent.click(lightningButton)

      // 应该显示筛选结果行数为1行
      await waitFor(() => {
        expect(screen.getByText(/1 行/)).toBeInTheDocument()
        expect(screen.getByText(/筛选结果/)).toBeInTheDocument()
      })
    })
  })

  describe('虚拟列草稿功能', () => {
    it('应该创建虚拟列草稿而不是直接修改原数据', async () => {
      const onDataChange = vi.fn()
      render(<YouTubeTable data={mockDataItems} onDataChange={onDataChange} />)

      // 模拟AI处理完成，创建虚拟列
      mockGetNewColumnKey.mockReturnValue('title_ai_draft_123')

      // 点击⚡按钮启动AI处理
      const lightningButton = screen.getByTitle('AI批处理此列')
      fireEvent.click(lightningButton)

      // 启动批处理
      fireEvent.click(screen.getByText('开始处理'))

      // 虚拟列应该创建但不影响原数据
      expect(onDataChange).not.toHaveBeenCalled()
      
      // 应该显示"AI草稿"标识
      await waitFor(() => {
        expect(screen.getByText(/AI草稿/)).toBeInTheDocument()
      })
    })

    it('应该在表头显示AI草稿提示和操作按钮', async () => {
      render(<YouTubeTable data={mockDataItems} />)

      // 模拟虚拟列创建完成
      mockGetNewColumnKey.mockReturnValue('title_ai_draft_123')

      // 应该显示草稿列标题和操作按钮
      await waitFor(() => {
        expect(screen.getByText(/AI草稿/)).toBeInTheDocument()
        expect(screen.getByTitle('全部接受')).toBeInTheDocument()
        expect(screen.getByTitle('撤销草稿')).toBeInTheDocument()
      })
    })

    it('应该支持逐行接受草稿内容', async () => {
      render(<YouTubeTable data={mockDataItems} />)

      // 模拟有草稿数据
      mockGetNewColumnKey.mockReturnValue('title_ai_draft_123')

      // 点击单行的接受按钮
      const acceptButton = screen.getByTitle('接受此行')
      fireEvent.click(acceptButton)

      // 应该调用接受单行方法
      expect(mockAcceptSingleRow).toHaveBeenCalledWith('1', 'title_ai_draft_123')
    })
  })

  describe('批量操作功能', () => {
    it('应该支持全部接受草稿', async () => {
      render(<YouTubeTable data={mockDataItems} />)

      // 点击全部接受按钮
      const acceptAllButton = screen.getByTitle('全部接受')
      fireEvent.click(acceptAllButton)

      // 应该调用提交虚拟列方法
      expect(mockCommitVirtualColumn).toHaveBeenCalledWith('accept_all')
    })

    it('应该支持撤销整个草稿', async () => {
      render(<YouTubeTable data={mockDataItems} />)

      // 点击撤销按钮
      const rejectButton = screen.getByTitle('撤销草稿')
      fireEvent.click(rejectButton)

      // 应该调用撤销虚拟列方法
      expect(mockRejectVirtualColumn).toHaveBeenCalled()
    })

    it('应该支持仅重跑失败项', async () => {
      render(<YouTubeTable data={mockDataItems} />)

      // 模拟有失败项
      const retryButton = screen.getByText('重试失败项')
      fireEvent.click(retryButton)

      // 应该调用重试方法
      expect(mockRetryFailedItems).toHaveBeenCalled()
    })
  })

  describe('提交落库逻辑', () => {
    it('应该支持虚拟列转为新列模式', async () => {
      render(<YouTubeTable data={mockDataItems} />)

      // 选择"虚拟列"写入目标
      const targetSelect = screen.getByLabelText('写入目标')
      fireEvent.change(targetSelect, { target: { value: 'virtual' } })

      // 提交时应该创建新列
      const commitButton = screen.getByText('提交')
      fireEvent.click(commitButton)

      expect(mockCommitVirtualColumn).toHaveBeenCalledWith('virtual')
    })

    it('应该支持覆盖原列模式（带版本控制）', async () => {
      render(<YouTubeTable data={mockDataItems} />)

      // 选择"覆盖"写入目标
      const targetSelect = screen.getByLabelText('写入目标')
      fireEvent.change(targetSelect, { target: { value: 'overwrite' } })

      // 提交时应该先备份再覆盖
      const commitButton = screen.getByText('提交')
      fireEvent.click(commitButton)

      expect(mockCommitVirtualColumn).toHaveBeenCalledWith('overwrite')
    })

    it('应该支持追加内容模式', async () => {
      render(<YouTubeTable data={mockDataItems} />)

      // 选择"追加"写入目标
      const targetSelect = screen.getByLabelText('写入目标')
      fireEvent.change(targetSelect, { target: { value: 'append' } })

      // 提交时应该拼接内容
      const commitButton = screen.getByText('提交')
      fireEvent.click(commitButton)

      expect(mockCommitVirtualColumn).toHaveBeenCalledWith('append')
    })
  })

  describe('错误处理', () => {
    it('应该正确处理JSON解析失败的情况', async () => {
      render(<YouTubeTable data={mockDataItems} />)

      // 模拟JSON解析失败
      const errorCell = screen.getByTitle('JSON解析错误')
      expect(errorCell).toBeInTheDocument()

      // 应该显示"当作纯文本接受"选项
      const acceptAsTextButton = screen.getByTitle('当作纯文本接受')
      fireEvent.click(acceptAsTextButton)

      expect(mockAcceptSingleRow).toHaveBeenCalledWith(
        expect.any(String), 
        expect.any(String),
        { treatAsText: true }
      )
    })

    it('应该支持幂等性检查', async () => {
      render(<YouTubeTable data={mockDataItems} />)

      // 使用相同配置再次提交
      const lightningButton = screen.getByTitle('AI批处理此列')
      fireEvent.click(lightningButton)
      fireEvent.click(lightningButton) // 重复点击

      // 应该检查幂等性，不重复创建任务
      expect(mockStartBatch).toHaveBeenCalledTimes(1)
    })
  })
})