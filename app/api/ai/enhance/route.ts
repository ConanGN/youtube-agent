import { NextRequest, NextResponse } from 'next/server'
import { getAIConfig } from '@/lib/ai/config'
import { YouTubeVideo, EnhancementType } from '@/types'

// AI增强功能API
// 支持标题优化、描述摘要、内容翻译等功能

// OpenRouter API调用函数
async function callOpenRouterAPI(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 150
): Promise<{ text: string; usage?: { totalTokens: number } }> {
  const config = getAIConfig();
  
  const response = await fetch(config.baseURL + '/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'YouTube Agent Enhancement',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OpenRouter API错误 (${response.status}): ${errorData}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  
  if (!message?.content) {
    throw new Error('AI返回了空内容');
  }

  return {
    text: message.content,
    usage: {
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}

interface EnhanceRequest {
  videos: YouTubeVideo[]
  enhancementType: EnhancementType
  prompt?: string
  options?: {
    language?: string
    style?: string
    maxLength?: number
  }
}

interface EnhanceResponse {
  success: boolean
  results: Array<{
    videoId: string
    enhancedContent: string
    originalContent: string
    type: EnhancementType
  }>
  error?: string
  tokensUsed?: number
}

// 预定义提示模板
const PROMPT_TEMPLATES = {
  optimize_title: {
    system: '你是一个专业的内容创作专家，擅长优化视频标题以提高点击率和搜索排名。',
    user: (title: string, description: string) => `
原始标题: "${title}"
视频描述: "${description.slice(0, 500)}..."

请为这个YouTube视频创建一个更吸引人的标题：
- 保持原意不变
- 提高点击率和SEO效果
- 字数控制在60字符以内
- 使用更有吸引力的词汇
- 突出视频的核心价值

请只返回优化后的标题，不要包含其他解释。`
  },
  
  summarize_description: {
    system: '你是一个专业的内容编辑，擅长将长篇内容精炼成简洁有力的摘要。',
    user: (description: string) => `
原始描述:
"${description}"

请为这个YouTube视频描述创建一个精炼的摘要：
- 提取关键信息和亮点
- 保持核心内容不变
- 字数控制在200字以内
- 使用简洁明了的语言
- 突出视频的主要价值

请只返回摘要内容，不要包含其他解释。`
  },
  
  translate_title: {
    system: '你是一个专业的翻译专家，擅长视频标题的本地化翻译。',
    user: (title: string, targetLang: string) => `
原始标题: "${title}"
目标语言: ${targetLang}

请将这个YouTube视频标题翻译成${targetLang}：
- 保持原意准确
- 符合目标语言的表达习惯
- 保持吸引力和可读性
- 适合视频内容的语境

请只返回翻译后的标题，不要包含其他解释。`
  },
  
  extract_keywords: {
    system: '你是一个SEO专家，擅长从视频内容中提取关键词标签。',
    user: (title: string, description: string) => `
视频标题: "${title}"
视频描述: "${description.slice(0, 1000)}..."

请为这个YouTube视频提取10-15个相关的关键词标签：
- 与视频内容高度相关
- 有利于搜索发现
- 包含热门和长尾关键词
- 用逗号分隔

请只返回关键词列表，不要包含其他解释。`
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: EnhanceRequest = await request.json()
    const { videos, enhancementType, prompt, options = {} } = body

    // 验证请求参数
    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json(
        { success: false, error: '请提供有效的视频数据' },
        { status: 400 }
      )
    }

    if (!enhancementType) {
      return NextResponse.json(
        { success: false, error: '请指定增强类型' },
        { status: 400 }
      )
    }

    // 限制批量处理数量
    if (videos.length > 50) {
      return NextResponse.json(
        { success: false, error: '一次最多处理50个视频' },
        { status: 400 }
      )
    }

    const results = []
    let totalTokensUsed = 0

    // 处理每个视频
    for (const video of videos) {
      try {
        let enhancedContent = ''
        const template = PROMPT_TEMPLATES[enhancementType as keyof typeof PROMPT_TEMPLATES]
        
        if (!template) {
          throw new Error(`不支持的增强类型: ${enhancementType}`)
        }

        // 根据增强类型生成提示
        let userPrompt = ''
        let originalContent = ''

        switch (enhancementType) {
          case 'optimize_title':
            userPrompt = template.user(video.title, video.description)
            originalContent = video.title
            break
          case 'summarize_description':
            userPrompt = template.user(video.description)
            originalContent = video.description
            break
          case 'translate_title':
            const targetLang = options.language || '中文'
            userPrompt = (template as any).user(video.title, targetLang)
            originalContent = video.title
            break
          case 'extract_keywords':
            userPrompt = template.user(video.title, video.description)
            originalContent = `${video.title} | ${video.description.slice(0, 200)}`
            break
          default:
            throw new Error(`不支持的增强类型: ${enhancementType}`)
        }

        // 使用自定义提示（如果提供）
        if (prompt) {
          userPrompt = prompt
            .replace('{title}', video.title)
            .replace('{description}', video.description)
            .replace('{channelTitle}', video.channelTitle)
        }

        // 调用OpenRouter API生成内容
        const result = await callOpenRouterAPI(
          template.system,
          userPrompt,
          options.maxLength || 150
        )

        enhancedContent = result.text.trim()
        totalTokensUsed += result.usage?.totalTokens || 0

        results.push({
          videoId: video.id,
          enhancedContent,
          originalContent,
          type: enhancementType,
        })

        // 添加延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`处理视频 ${video.id} 时出错:`, error)
        results.push({
          videoId: video.id,
          enhancedContent: '',
          originalContent: video.title || video.description || '',
          type: enhancementType,
          error: error instanceof Error ? error.message : '处理失败'
        })
      }
    }

    // 检查是否有成功结果
    const successCount = results.filter(r => r.enhancedContent && !('error' in r)).length
    
    if (successCount === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: '所有视频处理失败，请检查输入数据或稍后重试',
          results 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      results,
      tokensUsed: totalTokensUsed,
      message: `成功处理 ${successCount}/${videos.length} 个视频`
    })

  } catch (error) {
    console.error('AI增强API错误:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'AI增强服务暂时不可用'
      },
      { status: 500 }
    )
  }
}

// 获取可用的增强类型和模板
export async function GET() {
  return NextResponse.json({
    success: true,
    enhancementTypes: [
      {
        id: 'optimize_title',
        name: '标题优化',
        description: '优化视频标题以提高点击率和SEO效果',
        maxLength: 60
      },
      {
        id: 'summarize_description',
        name: '描述摘要',
        description: '将长描述精炼成简洁摘要',
        maxLength: 200
      },
      {
        id: 'translate_title',
        name: '标题翻译',
        description: '将标题翻译成其他语言',
        supportedLanguages: ['中文', 'English', '日本語', 'Español', 'Français']
      },
      {
        id: 'extract_keywords',
        name: '关键词提取',
        description: '从视频内容中提取SEO关键词',
        maxLength: 100
      }
    ],
    promptTemplates: Object.keys(PROMPT_TEMPLATES).map(key => ({
      id: key,
      name: PROMPT_TEMPLATES[key as keyof typeof PROMPT_TEMPLATES].system
    }))
  })
}