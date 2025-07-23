import './globals.css'
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'YouTube Agent - 数据处理与AI增强平台',
  description: '批量处理YouTube视频数据，AI增强文案，支持数据导出的专业工具',
  keywords: ['YouTube', 'AI', '数据分析', '批量处理', '内容优化'],
  authors: [{ name: 'YouTube Agent Team' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-youtube-red rounded flex items-center justify-center">
                  <span className="text-white font-bold text-sm">YT</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">
                  YouTube Agent
                </h1>
              </div>
              <div className="text-sm text-gray-600">
                数据处理与AI增强平台
              </div>
            </div>
          </div>
        </header>
        
        <main className="container mx-auto px-4 py-6">
          {children}
        </main>
        
        <footer className="bg-white border-t mt-auto">
          <div className="container mx-auto px-4 py-4 text-center text-sm text-gray-600">
            <p>© 2024 YouTube Agent. 遵循YouTube API服务条款和数据使用政策。</p>
          </div>
        </footer>
      </body>
    </html>
  )
}