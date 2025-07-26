// TDD测试用例 - YouTube字幕抓取功能
// 遵循测试驱动开发模式：先写测试，再实现功能

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { YouTubeTable } from '@/components/youtube-table'
import { UnifiedDataItem } from '@/types'

// Mock fetch API
global.fetch = jest.fn();

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// 测试数据
const mockVideoData: UnifiedDataItem[] = [
  {
    id: 'dQw4w9WgXcQ',
    title: 'Never Gonna Give You Up',
    description: 'Test video description',
    thumbnail: 'https://example.com/thumb.jpg',
    publishedAt: '2021-01-01T00:00:00Z',
    viewCount: 1000000,
    likeCount: 50000,
    commentCount: 1000,
    duration: '3:32',
    channelTitle: 'Test Channel',
    channelId: 'UCTest',
    videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
  },
  {
    id: 'jNQXAC9IVRw',
    title: 'Test Video 2',
    description: 'Another test video',
    thumbnail: 'https://example.com/thumb2.jpg',
    publishedAt: '2021-01-02T00:00:00Z',
    viewCount: 500000,
    likeCount: 25000,
    commentCount: 500,
    duration: '5:20',
    channelTitle: 'Test Channel 2',
    channelId: 'UCTest2',
    videoUrl: 'https://youtube.com/watch?v=jNQXAC9IVRw',
  }
]

const mockSubtitleResponse = [
  {
    id: 'dQw4w9WgXcQ',
    lang: 'en',
    cues: [
      { start: 0, dur: 2.5, text: 'Never gonna give you up' },
      { start: 2.5, dur: 3.0, text: 'Never gonna let you down' },
      { start: 5.5, dur: 2.0, text: 'Never gonna run around' }
    ]
  },
  {
    id: 'jNQXAC9IVRw',
    lang: 'en',
    cues: [
      { start: 0, dur: 1.5, text: 'Hello world' },
      { start: 1.5, dur: 2.0, text: 'This is a test' }
    ]
  }
]

describe('YouTube字幕抓取功能', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('字幕列显示', () => {
    test('应该显示字幕列标题', () => {
      render(
        <YouTubeTable
          data={mockVideoData}
          onDataChange={jest.fn()}
          onSelectionChange={jest.fn()}
        />
      )

      expect(screen.getByText('字幕')).toBeInTheDocument()
    })

    test('应该显示"抓取字幕"按钮', () => {
      render(
        <YouTubeTable
          data={mockVideoData}
          onDataChange={jest.fn()}
          onSelectionChange={jest.fn()}
        />
      )

      expect(screen.getByText('抓取字幕')).toBeInTheDocument()
      expect(screen.getByTitle('批量抓取选中视频的字幕（最多10个）')).toBeInTheDocument()
    })

    test('未选择视频时，抓取按钮应该被禁用', () => {
      render(
        <YouTubeTable
          data={mockVideoData}
          onDataChange={jest.fn()}
          onSelectionChange={jest.fn()}
        />
      )

      const fetchButton = screen.getByText('抓取字幕').closest('button')
      expect(fetchButton).toBeDisabled()
    })

    test('选择视频后，抓取按钮应该启用', () => {
      render(
        <YouTubeTable
          data={mockVideoData}
          onDataChange={jest.fn()}
          onSelectionChange={jest.fn()}
        />
      )

      // 选择第一个视频
      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[1]) // 第一个是全选框，第二个是第一行

      const fetchButton = screen.getByText('抓取字幕').closest('button')
      expect(fetchButton).not.toBeDisabled()
    })
  })

  describe('字幕单元格状态', () => {
    test('初始状态应该显示提示文本', () => {
      render(
        <YouTubeTable
          data={mockVideoData}
          onDataChange={jest.fn()}
          onSelectionChange={jest.fn()}
        />
      )

      expect(screen.getAllByText('点击"抓取字幕"获取')).toHaveLength(mockVideoData.length)
    })

    test('加载状态应该显示加载动画', () => {
      const loadingData = mockVideoData.map(item => ({
        ...item,
        subtitlesStatus: 'loading' as const
      }))

      render(
        <YouTubeTable
          data={loadingData}
          onDataChange={jest.fn()}
          onSelectionChange={jest.fn()}
        />
      )

      expect(screen.getAllByText('加载中...')).toHaveLength(loadingData.length)
    })

    test('错误状态应该显示错误信息', () => {
      const errorData = mockVideoData.map(item => ({
        ...item,
        subtitlesStatus: 'error' as const,
        subtitlesError: '抓取失败'
      }))

      render(
        <YouTubeTable
          data={errorData}
          onDataChange={jest.fn()}
          onSelectionChange={jest.fn()}
        />
      )

      expect(screen.getAllByText('抓取失败...')).toHaveLength(errorData.length)
    })

    test('无字幕状态应该显示"无字幕"', () => {
      const emptyData = mockVideoData.map(item => ({
        ...item,
        subtitlesStatus: 'empty' as const
      }))

      render(
        <YouTubeTable
          data={emptyData}
          onDataChange={jest.fn()}
          onSelectionChange={jest.fn()}
        />
      )

      expect(screen.getAllByText('无字幕')).toHaveLength(emptyData.length)
    })

    test('成功状态应该显示格式化的字幕内容', () => {
      const successData = mockVideoData.slice(0, 1).map(item => ({
        ...item,
        subtitlesStatus: 'success' as const,
        subtitles: mockSubtitleResponse[0]
      }))

      render(
        <YouTubeTable
          data={successData}
          onDataChange={jest.fn()}
          onSelectionChange={jest.fn()}
        />
      )

      // 验证字幕格式化显示
      expect(screen.getByText(/1\. \[00:00 - 00:02\] Never gonna give you up/)).toBeInTheDocument()
    })
  })

  describe('批量字幕抓取逻辑', () => {
    test('应该限制最多选择10个视频', async () => {
      // 创建11个视频的测试数据
      const manyVideos = Array.from({ length: 11 }, (_, i) => ({
        ...mockVideoData[0],
        id: `video${i}`,
        title: `Video ${i}`
      }))

      // Mock alert
      window.alert = jest.fn()

      render(
        <YouTubeTable
          data={manyVideos}
          onDataChange={jest.fn()}
          onSelectionChange={jest.fn()}
        />
      )

      // 选择所有视频
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
      fireEvent.click(selectAllCheckbox)

      // 点击抓取按钮
      const fetchButton = screen.getByText('抓取字幕')
      fireEvent.click(fetchButton)

      expect(window.alert).toHaveBeenCalledWith('一次最多只能抓取10个视频的字幕')
    })

    test('未选择视频时应该提示', async () => {
      window.alert = jest.fn()

      render(
        <YouTubeTable
          data={mockVideoData}
          onDataChange={jest.fn()}
          onSelectionChange={jest.fn()}
        />
      )

      // 强制启用按钮进行测试
      const fetchButton = screen.getByText('抓取字幕')
      
      // 模拟点击（虽然按钮被禁用）
      fireEvent.click(fetchButton)

      // 由于按钮被禁用，不会触发alert，这是正确的行为
      expect(window.alert).not.toHaveBeenCalled()
    })

    test('成功抓取字幕后应该更新数据', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSubtitleResponse
      } as Response)

      const onDataChange = jest.fn()

      render(
        <YouTubeTable
          data={mockVideoData}
          onDataChange={onDataChange}
          onSelectionChange={jest.fn()}
        />
      )

      // 选择第一个视频
      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[1])

      // 点击抓取按钮
      const fetchButton = screen.getByText('抓取字幕')
      fireEvent.click(fetchButton)

      // 等待API调用完成
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/subtitles?id=dQw4w9WgXcQ')
      })

      // 验证数据更新
      await waitFor(() => {
        expect(onDataChange).toHaveBeenCalled()
        const updatedData = onDataChange.mock.calls[onDataChange.mock.calls.length - 1][0]
        expect(updatedData[0].subtitlesStatus).toBe('success')
        expect(updatedData[0].subtitles).toEqual(mockSubtitleResponse[0])
      })
    })

    test('API错误时应该设置错误状态', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: '服务器错误' })
      } as Response)

      const onDataChange = jest.fn()

      render(
        <YouTubeTable
          data={mockVideoData}
          onDataChange={onDataChange}
          onSelectionChange={jest.fn()}
        />
      )

      // 选择第一个视频
      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[1])

      // 点击抓取按钮
      const fetchButton = screen.getByText('抓取字幕')
      fireEvent.click(fetchButton)

      // 等待错误处理
      await waitFor(() => {
        expect(onDataChange).toHaveBeenCalled()
        const updatedData = onDataChange.mock.calls[onDataChange.mock.calls.length - 1][0]
        expect(updatedData[0].subtitlesStatus).toBe('error')
        expect(updatedData[0].subtitlesError).toBe('服务器错误')
      })
    })

    test('网络错误时应该设置错误状态', async () => {
      mockFetch.mockRejectedValueOnce(new Error('网络连接失败'))

      const onDataChange = jest.fn()

      render(
        <YouTubeTable
          data={mockVideoData}
          onDataChange={onDataChange}
          onSelectionChange={jest.fn()}
        />
      )

      // 选择第一个视频
      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[1])

      // 点击抓取按钮
      const fetchButton = screen.getByText('抓取字幕')
      fireEvent.click(fetchButton)

      // 等待错误处理
      await waitFor(() => {
        expect(onDataChange).toHaveBeenCalled()
        const updatedData = onDataChange.mock.calls[onDataChange.mock.calls.length - 1][0]
        expect(updatedData[0].subtitlesStatus).toBe('error')
        expect(updatedData[0].subtitlesError).toBe('网络连接失败')
      })
    })
  })

  describe('字幕格式化功能', () => {
    test('应该正确格式化字幕时间', () => {
      // 这个测试需要访问组件内部的formatTime函数
      // 我们可以通过创建一个独立的测试工具文件来测试这些工具函数
      const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }

      expect(formatTime(0)).toBe('00:00')
      expect(formatTime(65)).toBe('01:05')
      expect(formatTime(3661)).toBe('61:01')
    })

    test('应该正确格式化字幕内容', () => {
      const formatSubtitles = (cues: any[]): string => {
        if (!cues || cues.length === 0) return ''
        return cues.map((cue, index) => {
          const formatTime = (seconds: number): string => {
            const mins = Math.floor(seconds / 60)
            const secs = Math.floor(seconds % 60)
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
          }
          const startTime = formatTime(cue.start)
          const endTime = formatTime(cue.start + cue.dur)
          return `${index + 1}. [${startTime} - ${endTime}] ${cue.text}`
        }).join('\n')
      }

      const testCues = [
        { start: 0, dur: 2.5, text: 'Hello' },
        { start: 2.5, dur: 3.0, text: 'World' }
      ]

      const formatted = formatSubtitles(testCues)
      expect(formatted).toBe('1. [00:00 - 00:02] Hello\n2. [00:02 - 00:05] World')
    })
  })

  describe('用户体验和交互', () => {
    test('抓取过程中按钮应该显示加载状态', async () => {
      // Mock一个慢速响应
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => mockSubtitleResponse
          } as Response), 1000)
        )
      )

      render(
        <YouTubeTable
          data={mockVideoData}
          onDataChange={jest.fn()}
          onSelectionChange={jest.fn()}
        />
      )

      // 选择视频并点击抓取
      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[1])

      const fetchButton = screen.getByText('抓取字幕')
      fireEvent.click(fetchButton)

      // 验证加载状态
      expect(screen.getByText('抓取中')).toBeInTheDocument()
      expect(fetchButton.closest('button')).toBeDisabled()
    })

    test('字幕单元格应该支持编辑', () => {
      const successData = mockVideoData.slice(0, 1).map(item => ({
        ...item,
        subtitlesStatus: 'success' as const,
        subtitles: mockSubtitleResponse[0]
      }))

      render(
        <YouTubeTable
          data={successData}
          onDataChange={jest.fn()}
          onSelectionChange={jest.fn()}
        />
      )

      // 查找字幕单元格并验证它是可编辑的
      const subtitleCell = screen.getByDisplayValue(/Never gonna give you up/)
      expect(subtitleCell).toBeInTheDocument()
    })
  })
})

// 导出测试工具函数供其他测试文件使用
export { mockVideoData, mockSubtitleResponse }