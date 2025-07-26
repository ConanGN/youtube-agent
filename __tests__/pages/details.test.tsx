/**
 * 详情页面测试
 * 验证404修复和空状态显示
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import DetailsPage from '@/app/details/page'
import { useVideoState, useDialogState, useVideoActions, useDialogActions, useAppStore } from '@/store'

// Mock依赖
jest.mock('next/navigation')
jest.mock('@/store')
jest.mock('@/components/youtube-table', () => ({
  YouTubeTable: () => <div data-testid="youtube-table">YouTube Table</div>
}))
jest.mock('@/components/ai-enhancement', () => ({
  EnhancementPanel: () => <div data-testid="enhancement-panel">Enhancement Panel</div>
}))
jest.mock('@/components/export-dialog', () => ({
  ExportDialog: () => <div data-testid="export-dialog">Export Dialog</div>
}))

const mockPush = jest.fn()
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockUseVideoState = useVideoState as jest.MockedFunction<typeof useVideoState>
const mockUseDialogState = useDialogState as jest.MockedFunction<typeof useDialogState>
const mockUseVideoActions = useVideoActions as jest.MockedFunction<typeof useVideoActions>
const mockUseDialogActions = useDialogActions as jest.MockedFunction<typeof useDialogActions>
const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>

describe('DetailsPage', () => {
  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks()
    
    // Mock useRouter
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    } as any)
    
    // Mock默认状态
    mockUseDialogState.mockReturnValue({
      showEnhancementPanel: false,
      showExportDialog: false,
      showPromptTemplates: false,
    })
    
    mockUseVideoActions.mockReturnValue({
      setVideos: jest.fn(),
      addVideos: jest.fn(),
      updateVideo: jest.fn(),
      removeVideos: jest.fn(),
      clearVideos: jest.fn(),
    })
    
    mockUseDialogActions.mockReturnValue({
      setShowEnhancementPanel: jest.fn(),
      setShowExportDialog: jest.fn(),
      setShowPromptTemplates: jest.fn(),
    })
    
    mockUseAppStore.mockReturnValue({
      setSelectedVideoIds: jest.fn(),
      setError: jest.fn(),
    })
  })

  describe('空状态显示（修复404问题）', () => {
    it('应该在没有数据时显示友好的空状态页面而不是404', () => {
      // 模拟没有数据的状态
      mockUseVideoState.mockReturnValue({
        videos: [],
        selectedVideoIds: [],
        loading: false,
        error: null,
        hasVideos: false,
        hasSelectedVideos: false,
      })

      render(<DetailsPage />)

      // 验证显示空状态而不是重定向
      expect(screen.getByText('暂无数据')).toBeInTheDocument()
      expect(screen.getByText('您还没有上传任何数据。请先在主页上传YouTube链接或CSV文件。')).toBeInTheDocument()
      expect(screen.getByText('返回主页上传数据')).toBeInTheDocument()
      
      // 验证没有发生自动重定向
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('应该在空状态下提供返回主页的功能', () => {
      mockUseVideoState.mockReturnValue({
        videos: [],
        selectedVideoIds: [],
        loading: false,
        error: null,
        hasVideos: false,
        hasSelectedVideos: false,
      })

      render(<DetailsPage />)

      // 点击返回主页按钮
      const backButton = screen.getByText('返回主页上传数据')
      fireEvent.click(backButton)

      // 验证导航到主页
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('应该在页面头部显示返回主页链接', () => {
      mockUseVideoState.mockReturnValue({
        videos: [],
        selectedVideoIds: [],
        loading: false,
        error: null,
        hasVideos: false,
        hasSelectedVideos: false,
      })

      render(<DetailsPage />)

      // 验证页面头部的返回链接
      const headerBackLink = screen.getByText('← 返回主页')
      expect(headerBackLink).toBeInTheDocument()
      
      fireEvent.click(headerBackLink)
      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('应该显示使用指引帮助用户了解下一步操作', () => {
      mockUseVideoState.mockReturnValue({
        videos: [],
        selectedVideoIds: [],
        loading: false,
        error: null,
        hasVideos: false,
        hasSelectedVideos: false,
      })

      render(<DetailsPage />)

      // 验证使用指引
      expect(screen.getByText('或者您可以直接在主页：')).toBeInTheDocument()
      expect(screen.getByText('• 输入YouTube频道链接或视频链接')).toBeInTheDocument()
      expect(screen.getByText('• 上传CSV数据文件')).toBeInTheDocument()
      expect(screen.getByText('• 使用AI功能增强和分析数据')).toBeInTheDocument()
    })
  })

  describe('正常数据显示', () => {
    it('应该在有数据时显示正常的表格页面', () => {
      // 模拟有数据的状态
      mockUseVideoState.mockReturnValue({
        videos: [
          { id: '1', title: '测试视频1', channelTitle: '测试频道' },
          { id: '2', title: '测试视频2', channelTitle: '测试频道' },
        ] as any,
        selectedVideoIds: [],
        loading: false,
        error: null,
        hasVideos: true,
        hasSelectedVideos: false,
      })

      render(<DetailsPage />)

      // 验证显示数据表格而不是空状态
      expect(screen.getByTestId('youtube-table')).toBeInTheDocument()
      expect(screen.queryByText('暂无数据')).not.toBeInTheDocument()
      
      // 验证统计信息
      expect(screen.getByText('总计: 2 条数据')).toBeInTheDocument()
    })
  })
})