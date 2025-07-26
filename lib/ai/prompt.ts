import Mustache from 'mustache';
import crypto from 'crypto-js';

// 提示词模板数据接口
export interface PromptTemplateData {
  content: string;
  [key: string]: any;
}

// 预定义的提示词模板
export const PRESET_TEMPLATES = {
  summarize: '请将以下内容总结为120字以内的摘要：{{content}}',
  seo_title: '请将以下内容改写为120字以内的SEO友好标题：{{content}}',
  translate_en: '请将以下中文内容翻译为英文：{{content}}',
  translate_cn: '请将以下英文内容翻译为中文：{{content}}',
  extract_keywords: '请从以下内容中提取5-10个关键词，用逗号分隔：{{content}}',
  sentiment_analysis: '请分析以下内容的情感倾向（正面/负面/中性）：{{content}}',
  content_category: '请为以下内容分配一个合适的分类：{{content}}',
} as const;

export type PresetTemplate = keyof typeof PRESET_TEMPLATES;

/**
 * 渲染提示词模板
 * @param template - Mustache模板字符串
 * @param data - 模板数据
 * @returns 渲染后的提示词
 */
export function renderTemplate(template: string, data: PromptTemplateData): string {
  try {
    // 禁用HTML转义，因为我们处理的是普通文本
    Mustache.escape = (text) => text;
    
    // 验证模板语法
    const parsed = Mustache.parse(template);
    if (!parsed || parsed.length === 0) {
      throw new Error('无效的模板语法');
    }
    
    // 渲染模板
    const rendered = Mustache.render(template, data);
    
    // 基本安全检查 - 防止过长的提示词
    if (rendered.length > 10000) {
      throw new Error('渲染后的提示词过长（超过10000字符）');
    }
    
    return rendered.trim();
    
  } catch (error) {
    console.error('模板渲染失败:', error);
    throw new Error(`模板渲染失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 生成提示词模板的哈希值
 * @param template - 提示词模板
 * @returns 8位短哈希值
 */
export function hashPrompt(template: string): string {
  const hash = crypto.SHA256(template).toString();
  return hash.substring(0, 8);
}

/**
 * 验证提示词模板
 * @param template - 提示词模板
 * @returns 验证结果
 */
export function validateTemplate(template: string): { 
  isValid: boolean; 
  error?: string; 
  variables: string[]; 
} {
  try {
    // 基本检查
    if (!template || template.trim().length === 0) {
      return { isValid: false, error: '模板不能为空', variables: [] };
    }
    
    if (template.length > 5000) {
      return { isValid: false, error: '模板过长（超过5000字符）', variables: [] };
    }
    
    // 解析模板获取变量
    const parsed = Mustache.parse(template);
    const variables: string[] = [];
    
    for (const token of parsed) {
      if (token[0] === 'name' || token[0] === '&' || token[0] === '{') {
        const varName = token[1];
        if (!variables.includes(varName)) {
          variables.push(varName);
        }
      }
    }
    
    // 检查是否包含必需的content变量
    if (!variables.includes('content')) {
      return { 
        isValid: false, 
        error: '模板必须包含{{content}}变量', 
        variables 
      };
    }
    
    // 检查变量名是否合法
    const invalidVars = variables.filter(v => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v));
    if (invalidVars.length > 0) {
      return { 
        isValid: false, 
        error: `无效的变量名: ${invalidVars.join(', ')}`, 
        variables 
      };
    }
    
    return { isValid: true, variables };
    
  } catch (error) {
    return { 
      isValid: false, 
      error: `模板语法错误: ${error instanceof Error ? error.message : '未知错误'}`,
      variables: [] 
    };
  }
}

/**
 * 获取预设模板
 * @param preset - 预设模板名称
 * @returns 模板字符串
 */
export function getPresetTemplate(preset: PresetTemplate): string {
  return PRESET_TEMPLATES[preset];
}

/**
 * 获取所有预设模板
 * @returns 预设模板列表
 */
export function getAllPresetTemplates(): Array<{ key: PresetTemplate; name: string; template: string }> {
  return Object.entries(PRESET_TEMPLATES).map(([key, template]) => ({
    key: key as PresetTemplate,
    name: getTemplateName(key as PresetTemplate),
    template,
  }));
}

/**
 * 获取模板的友好名称
 * @param preset - 预设模板名称
 * @returns 友好名称
 */
function getTemplateName(preset: PresetTemplate): string {
  const names: Record<PresetTemplate, string> = {
    summarize: '内容摘要',
    seo_title: 'SEO标题',
    translate_en: '翻译为英文',
    translate_cn: '翻译为中文',
    extract_keywords: '提取关键词',
    sentiment_analysis: '情感分析',
    content_category: '内容分类',
  };
  return names[preset];
}