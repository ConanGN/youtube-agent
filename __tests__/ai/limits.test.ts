import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  estimateTokens,
  estimateTokenCost,
  validateBatchLimits,
  getModelDisplayName,
  formatCost,
  MODEL_PRICING,
} from '@/lib/ai/limits';

// Mock environment variables
beforeEach(() => {
  process.env.MAX_JOB_COST_USD = '10.00';
});

describe('AI Limits 模块测试', () => {
  describe('estimateTokens', () => {
    it('应该为空字符串返回0', () => {
      expect(estimateTokens('')).toBe(0);
      expect(estimateTokens('   ')).toBe(0);
    });

    it('应该估算英文文本token数', () => {
      const englishText = 'Hello world this is a test';
      const tokens = estimateTokens(englishText);
      
      // 英文大约4字符/token，这个文本约26字符，应该在6-7个token左右
      expect(tokens).toBeGreaterThan(5);
      expect(tokens).toBeLessThan(10);
    });

    it('应该估算中文文本token数', () => {
      const chineseText = '这是一个测试文本';
      const tokens = estimateTokens(chineseText);
      
      // 中文大约1.5字符/token，8个字符应该在5-6个token左右
      expect(tokens).toBeGreaterThan(4);
      expect(tokens).toBeLessThan(8);
    });

    it('应该估算中英混合文本token数', () => {
      const mixedText = '这是test文本with中英混合';
      const tokens = estimateTokens(mixedText);
      
      expect(tokens).toBeGreaterThan(6);
      expect(tokens).toBeLessThan(15);
    });

    it('应该为很短的文本返回至少1个token', () => {
      expect(estimateTokens('a')).toBe(1);
      expect(estimateTokens('中')).toBe(1);
    });
  });

  describe('estimateTokenCost', () => {
    const testContents = ['这是测试内容1', '这是测试内容2', 'This is test content 3'];
    const testTemplate = '请处理以下内容：{{content}}';
    const testModel = 'qwen/qwen3-coder:free';

    it('应该计算基本费用估算', () => {
      const estimate = estimateTokenCost(testContents, testModel, testTemplate);
      
      expect(estimate).toHaveProperty('inputTokens');
      expect(estimate).toHaveProperty('outputTokens');
      expect(estimate).toHaveProperty('inputCost');
      expect(estimate).toHaveProperty('outputCost');
      expect(estimate).toHaveProperty('totalCost');
      expect(estimate.currency).toBe('USD');
      
      expect(estimate.inputTokens).toBeGreaterThan(0);
      expect(estimate.outputTokens).toBeGreaterThan(0);
      expect(estimate.totalCost).toBeGreaterThan(0);
    });

    it('应该根据内容数量线性增长输入token', () => {
      const singleContent = ['单个内容'];
      const multipleContent = ['内容1', '内容2', '内容3'];
      
      const singleEstimate = estimateTokenCost(singleContent, testModel, testTemplate);
      const multipleEstimate = estimateTokenCost(multipleContent, testModel, testTemplate);
      
      expect(multipleEstimate.inputTokens).toBeGreaterThan(singleEstimate.inputTokens);
      expect(multipleEstimate.outputTokens).toBeGreaterThan(singleEstimate.outputTokens);
    });

    it('应该为不同模型返回不同费用', () => {
      const freeEstimate = estimateTokenCost(testContents, 'qwen/qwen3-coder:free', testTemplate);
      const sonnetEstimate = estimateTokenCost(testContents, 'anthropic/claude-3-sonnet', testTemplate);
      
      // 免费模型应该比付费模型便宜
      expect(freeEstimate.totalCost).toBeLessThan(sonnetEstimate.totalCost);
    });

    it('应该对不支持的模型抛出错误', () => {
      expect(() => {
        estimateTokenCost(testContents, 'unsupported:model', testTemplate);
      }).toThrow('不支持的模型定价');
    });

    it('应该正确计算费用精度', () => {
      const estimate = estimateTokenCost(testContents, testModel, testTemplate);
      
      // 费用应该精确到小数点后6位
      expect(estimate.inputCost.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
      expect(estimate.outputCost.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
      expect(estimate.totalCost.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
    });
  });

  describe('validateBatchLimits', () => {
    const testContents = ['测试内容1', '测试内容2'];
    const testTemplate = '处理：{{content}}';
    const testModel = 'qwen/qwen3-coder:free'; // 使用免费模型进行测试

    it('应该验证正常的批处理请求', () => {
      const result = validateBatchLimits(testContents, testModel, testTemplate);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.estimate).toBeDefined();
    });

    it('应该拒绝空内容数组', () => {
      const result = validateBatchLimits([], testModel, testTemplate);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('内容数组不能为空');
    });

    it('应该拒绝过多的批处理项目', () => {
      const largeContents = Array(1001).fill('测试内容');
      const result = validateBatchLimits(largeContents, testModel, testTemplate);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('批处理项目数量超出限制'))).toBe(true);
    });

    it('应该拒绝过长的单项内容', () => {
      const longContent = 'x'.repeat(10000); // 很长的内容
      const result = validateBatchLimits([longContent], testModel, testTemplate);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('内容过长'))).toBe(true);
    });

    it('应该支持自定义限制', () => {
      const customLimits = { maxItemsPerBatch: 2 };
      const result = validateBatchLimits(['1', '2', '3'], testModel, testTemplate, customLimits);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('批处理项目数量超出限制'))).toBe(true);
    });

    it('应该在费用估算失败时返回错误', () => {
      const result = validateBatchLimits(testContents, 'invalid:model', testTemplate);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('费用估算失败'))).toBe(true);
    });
  });

  describe('getModelDisplayName', () => {
    it('应该返回已知模型的友好名称', () => {
      expect(getModelDisplayName('qwen/qwen3-coder:free')).toBe('Qwen3 Coder (免费)');
      expect(getModelDisplayName('anthropic/claude-3-sonnet')).toBe('Claude 3 Sonnet');
      expect(getModelDisplayName('openai/gpt-3.5-turbo')).toBe('GPT-3.5 Turbo');
      // 保持对旧模型的兼容性
      expect(getModelDisplayName('anthropic:claude-3-5-sonnet-20240620')).toBe('Claude 3.5 Sonnet');
    });

    it('应该返回未知模型的原始名称', () => {
      const unknownModel = 'unknown:model';
      expect(getModelDisplayName(unknownModel)).toBe(unknownModel);
    });
  });

  describe('formatCost', () => {
    it('应该正确格式化正常费用', () => {
      expect(formatCost(1.2345)).toBe('$1.2345');
      expect(formatCost(0.1234)).toBe('$0.1234');
      expect(formatCost(10)).toBe('$10.0000');
    });

    it('应该正确处理极小费用', () => {
      expect(formatCost(0.00005)).toBe('< $0.0001');
      expect(formatCost(0)).toBe('< $0.0001');
    });

    it('应该正确处理边界值', () => {
      expect(formatCost(0.0001)).toBe('$0.0001');
      expect(formatCost(0.00011)).toBe('$0.0001');
    });
  });

  describe('MODEL_PRICING', () => {
    it('应该包含所有支持的模型', () => {
      const expectedModels = [
        'qwen/qwen3-coder:free',
        'anthropic/claude-3-sonnet',
        'openai/gpt-3.5-turbo',
        // 保持对旧模型的兼容性
        'anthropic:claude-3-5-sonnet-20240620',
        'anthropic:claude-3-haiku-20240307',
        'anthropic:claude-3-opus-20240229',
      ];

      expectedModels.forEach(model => {
        expect(MODEL_PRICING).toHaveProperty(model);
        expect(MODEL_PRICING[model as keyof typeof MODEL_PRICING]).toHaveProperty('input');
        expect(MODEL_PRICING[model as keyof typeof MODEL_PRICING]).toHaveProperty('output');
      });
    });

    it('应该有合理的定价结构', () => {
      Object.values(MODEL_PRICING).forEach(pricing => {
        expect(pricing.input).toBeGreaterThanOrEqual(0); // 允许免费模型
        expect(pricing.output).toBeGreaterThanOrEqual(0); // 允许免费模型
        // 对于付费模型，输出通常比输入更贵
        if (pricing.input > 0) {
          expect(pricing.output).toBeGreaterThanOrEqual(pricing.input);
        }
      });
    });

    it('免费模型应该是真正免费的', () => {
      const freeModel = MODEL_PRICING['qwen/qwen3-coder:free'];
      expect(freeModel.input).toBe(0);
      expect(freeModel.output).toBe(0);
    });
  });
});