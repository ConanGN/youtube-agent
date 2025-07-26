import { describe, it, expect } from 'vitest';
import {
  renderTemplate,
  hashPrompt,
  validateTemplate,
  getPresetTemplate,
  getAllPresetTemplates,
  PRESET_TEMPLATES,
} from '@/lib/ai/prompt';

describe('AI Prompt 模块测试', () => {
  describe('renderTemplate', () => {
    it('应该正确渲染简单模板', () => {
      const template = '请总结以下内容：{{content}}';
      const data = { content: '这是测试内容' };
      const result = renderTemplate(template, data);
      
      expect(result).toBe('请总结以下内容：这是测试内容');
    });

    it('应该正确渲染包含多个变量的模板', () => {
      const template = '将{{content}}翻译为{{language}}';
      const data = { content: 'Hello World', language: '中文' };
      const result = renderTemplate(template, data);
      
      expect(result).toBe('将Hello World翻译为中文');
    });

    it('应该处理空值变量', () => {
      const template = '内容：{{content}}，标题：{{title}}';
      const data = { content: '测试内容', title: '' };
      const result = renderTemplate(template, data);
      
      expect(result).toBe('内容：测试内容，标题：');
    });

    it('应该抛出模板过长的错误', () => {
      const template = '{{content}}' + 'x'.repeat(10000);
      const data = { content: '测试' };
      
      expect(() => renderTemplate(template, data)).toThrow('渲染后的提示词过长');
    });

    it('应该处理无效模板语法', () => {
      const invalidTemplate = '{{content';
      const data = { content: '测试' };
      
      expect(() => renderTemplate(invalidTemplate, data)).toThrow('模板渲染失败');
    });
  });

  describe('hashPrompt', () => {
    it('应该为相同模板生成相同哈希', () => {
      const template = '请总结：{{content}}';
      const hash1 = hashPrompt(template);
      const hash2 = hashPrompt(template);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(8);
    });

    it('应该为不同模板生成不同哈希', () => {
      const template1 = '请总结：{{content}}';
      const template2 = '请翻译：{{content}}';
      const hash1 = hashPrompt(template1);
      const hash2 = hashPrompt(template2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('validateTemplate', () => {
    it('应该验证有效模板', () => {
      const template = '请处理：{{content}}';
      const result = validateTemplate(template);
      
      expect(result.isValid).toBe(true);
      expect(result.variables).toContain('content');
      expect(result.error).toBeUndefined();
    });

    it('应该拒绝空模板', () => {
      const result = validateTemplate('');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('模板不能为空');
    });

    it('应该拒绝没有content变量的模板', () => {
      const template = '请处理：{{title}}';
      const result = validateTemplate(template);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('模板必须包含{{content}}变量');
    });

    it('应该拒绝过长模板', () => {
      const template = '{{content}}' + 'x'.repeat(5000);
      const result = validateTemplate(template);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('模板过长（超过5000字符）');
    });

    it('应该识别多个变量', () => {
      const template = '将{{content}}翻译为{{language}}，标题是{{title}}';
      const result = validateTemplate(template);
      
      expect(result.isValid).toBe(true);
      expect(result.variables).toEqual(['content', 'language', 'title']);
    });

    it('应该拒绝无效变量名', () => {
      const template = '处理{{content}}和{{123invalid}}';
      const result = validateTemplate(template);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('无效的变量名');
    });
  });

  describe('getPresetTemplate', () => {
    it('应该返回正确的预设模板', () => {
      const template = getPresetTemplate('summarize');
      expect(template).toBe(PRESET_TEMPLATES.summarize);
    });

    it('应该为所有预设返回有效模板', () => {
      Object.keys(PRESET_TEMPLATES).forEach(preset => {
        const template = getPresetTemplate(preset as keyof typeof PRESET_TEMPLATES);
        expect(template).toBeTruthy();
        expect(template).toContain('{{content}}');
      });
    });
  });

  describe('getAllPresetTemplates', () => {
    it('应该返回所有预设模板', () => {
      const templates = getAllPresetTemplates();
      
      expect(templates).toHaveLength(Object.keys(PRESET_TEMPLATES).length);
      templates.forEach(template => {
        expect(template).toHaveProperty('key');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('template');
        expect(template.template).toContain('{{content}}');
      });
    });

    it('应该包含所有预设类型', () => {
      const templates = getAllPresetTemplates();
      const keys = templates.map(t => t.key);
      
      Object.keys(PRESET_TEMPLATES).forEach(preset => {
        expect(keys).toContain(preset);
      });
    });
  });
});