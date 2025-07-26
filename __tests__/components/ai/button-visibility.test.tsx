/**
 * AI弹窗按钮可见性和状态测试
 * 测试按钮在不同状态下的显示和交互
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AIPromptDrawer from '@/app/components/ai/AIPromptDrawer'

// Mock dependencies
vi.mock('@/lib/ai/prompt', () => ({
  validateTemplate: vi.fn((template) => ({
    isValid: template && template.length > 0,
    variables: template ? ['content'] : [],
    error: template ? undefined : '请输入模板'
  })),
  getAllPresetTemplates: vi.fn(() => [
    { key: 'summary', name: '内容摘要' },
    { key: 'translate', name: '翻译' }
  ]),
  getPresetTemplate: vi.fn(() => '请将以下内容总结为50字：{{content}}'),
}))

vi.mock('@/lib/ai/limits', () => ({
  estimateTokenCost: vi.fn(() => ({
    inputTokens: 100,
    outputTokens: 50,
    totalCost: 0.001,
    currency: 'USD'
  })),
  formatCost: vi.fn((cost) => `$${cost.toFixed(3)}`),
  getModelDisplayName: vi.fn((model) => model),
  MODEL_PRICING: {
    'qwen/qwen3-coder:free': { input: 0, output: 0 }
  }
}))

vi.mock('@/lib/ai/config', () => ({
  OPENROUTER_MODELS: {
    'qwen/qwen3-coder:free': 'Qwen3 Coder (免费)'
  }
}))

describe('AIPromptDrawer - 按钮可见性测试', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    columnId: 'title',
    columnName: '标题',
    dataCount: 3,
    sampleData: ['测试数据1', '测试数据2', '测试数据3'],
    selectedRowCount: 2,
    totalRowCount: 5,
    processingScope: 'selected' as 'selected' | 'filtered' | 'all',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('按钮存在性检查', () => {
    it('应该始终显示取消按钮', () => {
      render(<AIPromptDrawer {...defaultProps} />)
      
      const cancelButton = screen.getByRole('button', { name: /取消/i })
      expect(cancelButton).toBeInTheDocument()
      expect(cancelButton).toBeEnabled()
    })

    it('应该始终显示开始处理按钮（即使被禁用）', () => {
      render(<AIPromptDrawer {...defaultProps} />)
      
      // 查找开始处理按钮，可能是"估算费用"或"开始处理"
      const submitButton = screen.getByRole('button', { name: /估算费用|开始处理/i })
      expect(submitButton).toBeInTheDocument()
    })

    it('当模板为空时，开始按钮应该被禁用但仍然可见', () => {
      render(<AIPromptDrawer {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /估算费用|开始处理/i })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('按钮状态变化', () => {
    it('输入有效模板后，按钮应该变为可用状态', () => {
      render(<AIPromptDrawer {...defaultProps} />)
      
      // 输入提示词模板
      const templateInput = screen.getByPlaceholderText(/请输入提示词模板/i)
      fireEvent.change(templateInput, { 
        target: { value: '请总结以下内容：{{content}}' } 
      })
      
      const submitButton = screen.getByRole('button', { name: /估算费用|开始处理/i })
      expect(submitButton).toBeEnabled()
    })

    it('清空模板后，按钮应该变为禁用状态', () => {
      render(<AIPromptDrawer {...defaultProps} />)
      
      const templateInput = screen.getByPlaceholderText(/请输入提示词模板/i)
      
      // 先输入模板
      fireEvent.change(templateInput, { 
        target: { value: '请总结以下内容：{{content}}' } 
      })
      
      let submitButton = screen.getByRole('button', { name: /估算费用|开始处理/i })
      expect(submitButton).toBeEnabled()
      
      // 然后清空模板
      fireEvent.change(templateInput, { target: { value: '' } })
      
      submitButton = screen.getByRole('button', { name: /估算费用|开始处理/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('按钮文本显示', () => {
    it('dry run模式下应该显示"估算费用"', () => {
      render(<AIPromptDrawer {...defaultProps} />)
      
      // 默认是dry run模式
      const submitButton = screen.getByRole('button', { name: /估算费用/i })
      expect(submitButton).toBeInTheDocument()
    })

    it('取消dry run模式后应该显示"开始处理"', () => {
      render(<AIPromptDrawer {...defaultProps} />)
      
      // 取消dry run选项
      const dryRunCheckbox = screen.getByRole('checkbox', { name: /仅估算费用/i })
      fireEvent.click(dryRunCheckbox)
      
      const submitButton = screen.getByRole('button', { name: /开始处理/i })
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('按钮交互功能', () => {
    it('点击取消按钮应该调用onClose', () => {
      const onClose = vi.fn()
      render(<AIPromptDrawer {...defaultProps} onClose={onClose} />)
      
      const cancelButton = screen.getByRole('button', { name: /取消/i })
      fireEvent.click(cancelButton)
      
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('输入有效模板后点击开始按钮应该调用onSubmit', () => {
      const onSubmit = vi.fn()
      render(<AIPromptDrawer {...defaultProps} onSubmit={onSubmit} />)
      
      // 输入有效模板
      const templateInput = screen.getByPlaceholderText(/请输入提示词模板/i)
      fireEvent.change(templateInput, { 
        target: { value: '请总结以下内容：{{content}}' } 
      })
      
      const submitButton = screen.getByRole('button', { name: /估算费用|开始处理/i })
      fireEvent.click(submitButton)
      
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith({
        model: 'qwen/qwen3-coder:free',
        promptTemplate: '请总结以下内容：{{content}}',
        maxConcurrency: 3,
        dryRun: true,
        writeTarget: 'virtual',
        processingScope: 'selected',
      })
    })

    it('模板无效时点击按钮不应该调用onSubmit', () => {
      const onSubmit = vi.fn()
      render(<AIPromptDrawer {...defaultProps} onSubmit={onSubmit} />)
      
      // 不输入模板，直接点击按钮
      const submitButton = screen.getByRole('button', { name: /估算费用|开始处理/i })
      fireEvent.click(submitButton)
      
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('按钮样式和可访问性', () => {
    it('禁用的按钮应该有明显的视觉标识', () => {
      render(<AIPromptDrawer {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /估算费用|开始处理/i })
      expect(submitButton).toHaveClass('disabled:bg-gray-300')
      expect(submitButton).toHaveClass('disabled:cursor-not-allowed')
    })

    it('启用的按钮应该有正常的交互样式', () => {
      render(<AIPromptDrawer {...defaultProps} />)
      
      // 输入有效模板
      const templateInput = screen.getByPlaceholderText(/请输入提示词模板/i)
      fireEvent.change(templateInput, { 
        target: { value: '请总结以下内容：{{content}}' } 
      })
      
      const submitButton = screen.getByRole('button', { name: /估算费用|开始处理/i })
      expect(submitButton).toHaveClass('bg-blue-600')
      expect(submitButton).toHaveClass('hover:bg-blue-700')
    })

    it('按钮应该包含图标以增强视觉识别', () => {
      render(<AIPromptDrawer {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /估算费用|开始处理/i })
      // 检查是否包含Play图标（通过查找SVG）
      const playIcon = submitButton.querySelector('svg')
      expect(playIcon).toBeInTheDocument()
    })
  })
})