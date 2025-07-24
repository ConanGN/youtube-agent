// 全局状态管理 - 使用Zustand
// 管理YouTube数据、UI状态、用户交互等

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { YouTubeVideo, DataInputType, UnifiedDataItem } from '@/types'

interface AppState {
  // 数据状态（支持YouTube和CSV数据）
  videos: UnifiedDataItem[]
  selectedVideoIds: string[]
  loading: boolean
  error: string | null
  
  // UI状态
  activeInputType: DataInputType | null
  
  // 对话框状态
  showEnhancementPanel: boolean
  showExportDialog: boolean
  showPromptTemplates: boolean
  
  // 数据操作
  setVideos: (videos: UnifiedDataItem[]) => void
  addVideos: (videos: UnifiedDataItem[]) => void
  updateVideo: (videoId: string, updates: Partial<UnifiedDataItem>) => void
  removeVideos: (videoIds: string[]) => void
  clearVideos: () => void
  
  // 选择操作
  setSelectedVideoIds: (ids: string[]) => void
  toggleVideoSelection: (videoId: string) => void
  selectAllVideos: () => void
  clearSelection: () => void
  
  // 状态操作
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setActiveInputType: (type: DataInputType | null) => void
  
  // 对话框操作
  setShowEnhancementPanel: (show: boolean) => void
  setShowExportDialog: (show: boolean) => void
  setShowPromptTemplates: (show: boolean) => void
  
  // 工具方法
  getSelectedVideos: () => UnifiedDataItem[]
  hasVideos: () => boolean
  hasSelectedVideos: () => boolean
}

// 创建状态管理器
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // 初始状态
      videos: [],
      selectedVideoIds: [],
      loading: false,
      error: null,
      activeInputType: null,
      showEnhancementPanel: false,
      showExportDialog: false,
      showPromptTemplates: false,
      
      // 数据操作
      setVideos: (videos) => set({ 
        videos,
        selectedVideoIds: [],
        error: null
      }),
      
      addVideos: (newVideos) => set((state) => {
        // 去重处理
        const existingIds = new Set(state.videos.map(v => v.id))
        const uniqueNewVideos = newVideos.filter(v => !existingIds.has(v.id))
        const allVideos = [...state.videos, ...uniqueNewVideos]
        
        return {
          videos: allVideos,
          error: null
        }
      }),
      
      updateVideo: (videoId, updates) => set((state) => ({
        videos: state.videos.map(video => 
          video.id === videoId 
            ? { ...video, ...updates, isEdited: true }
            : video
        )
      })),
      
      removeVideos: (videoIds) => set((state) => {
        const remainingVideos = state.videos.filter(v => !videoIds.includes(v.id))
        return {
          videos: remainingVideos,
          selectedVideoIds: state.selectedVideoIds.filter(id => !videoIds.includes(id))
        }
      }),
      
      clearVideos: () => set({
        videos: [],
        selectedVideoIds: [],
        error: null
      }),
      
      // 选择操作
      setSelectedVideoIds: (ids) => set({ selectedVideoIds: ids }),
      
      toggleVideoSelection: (videoId) => set((state) => ({
        selectedVideoIds: state.selectedVideoIds.includes(videoId)
          ? state.selectedVideoIds.filter(id => id !== videoId)
          : [...state.selectedVideoIds, videoId]
      })),
      
      selectAllVideos: () => set((state) => ({
        selectedVideoIds: state.videos.map(v => v.id)
      })),
      
      clearSelection: () => set({ selectedVideoIds: [] }),
      
      // 状态操作
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setActiveInputType: (type) => set({ activeInputType: type }),
      
      // 对话框操作
      setShowEnhancementPanel: (show) => set({ showEnhancementPanel: show }),
      setShowExportDialog: (show) => set({ showExportDialog: show }),
      setShowPromptTemplates: (show) => set({ showPromptTemplates: show }),
      
      // 工具方法
      getSelectedVideos: () => {
        const state = get()
        return state.videos.filter(v => state.selectedVideoIds.includes(v.id))
      },
      
      hasVideos: () => get().videos.length > 0,
      hasSelectedVideos: () => get().selectedVideoIds.length > 0,
    }),
    {
      name: 'youtube-agent-storage',
      // 只持久化必要的数据，排除UI状态
      partialize: (state) => ({
        videos: state.videos,
        selectedVideoIds: state.selectedVideoIds,
      }),
    }
  )
)

// 选择器钩子 - 用于性能优化
export const useVideos = () => useAppStore((state) => state.videos)
export const useSelectedVideoIds = () => useAppStore((state) => state.selectedVideoIds)
export const useLoading = () => useAppStore((state) => state.loading)
export const useError = () => useAppStore((state) => state.error)

// 组合选择器
export const useVideoState = () => useAppStore((state) => ({
  videos: state.videos,
  selectedVideoIds: state.selectedVideoIds,
  loading: state.loading,
  error: state.error,
  hasVideos: state.hasVideos(),
  hasSelectedVideos: state.hasSelectedVideos(),
}))

export const useDialogState = () => useAppStore((state) => ({
  showEnhancementPanel: state.showEnhancementPanel,
  showExportDialog: state.showExportDialog,
  showPromptTemplates: state.showPromptTemplates,
}))

// 操作钩子
export const useVideoActions = () => useAppStore((state) => ({
  setVideos: state.setVideos,
  addVideos: state.addVideos,
  updateVideo: state.updateVideo,
  removeVideos: state.removeVideos,
  clearVideos: state.clearVideos,
}))

export const useSelectionActions = () => useAppStore((state) => ({
  setSelectedVideoIds: state.setSelectedVideoIds,
  toggleVideoSelection: state.toggleVideoSelection,
  selectAllVideos: state.selectAllVideos,
  clearSelection: state.clearSelection,
}))

export const useDialogActions = () => useAppStore((state) => ({
  setShowEnhancementPanel: state.setShowEnhancementPanel,
  setShowExportDialog: state.setShowExportDialog,
  setShowPromptTemplates: state.setShowPromptTemplates,
}))