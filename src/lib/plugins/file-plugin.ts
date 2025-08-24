import { FileIcon, FolderIcon } from 'lucide-vue-next'
import type { SearchContext, SearchPlugin, SearchResultItem } from '../search-plugins'

interface FileSearchResult {
  name: string
  path: string
  is_dir: boolean
  size: number
  modified: number
}

/**
 * 文件搜索插件
 */
export class FileSearchPlugin implements SearchPlugin {
  id = 'files'
  name = '文件搜索'
  description = '搜索本地文件和目录'
  icon = FileIcon
  version = '1.0.0'
  enabled = true
  priority = 80
  searchPrefixes = ['file:', 'files:', 'f:']

  settings = {
    schema: [
      {
        key: 'searchPath',
        label: '搜索路径',
        description: '默认搜索路径，留空使用用户主目录',
        type: 'string' as const,
        defaultValue: ''
      },
      {
        key: 'maxResults',
        label: '最大结果数',
        description: '单次搜索返回的最大文件数量',
        type: 'number' as const,
        defaultValue: 30
      },
      {
        key: 'showHiddenFiles',
        label: '显示隐藏文件',
        description: '是否在结果中包含隐藏文件',
        type: 'boolean' as const,
        defaultValue: false
      }
    ],
    values: {
      searchPath: '',
      maxResults: 30,
      showHiddenFiles: false
    }
  }

  async initialize(): Promise<void> {
    console.log('文件搜索插件初始化完成')
  }

  async search(context: SearchContext): Promise<SearchResultItem[]> {
    const { query } = context
    
    if (query.length < 2) {
      return [] // 避免过短查询导致过多结果
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core')
      
      const searchResults: FileSearchResult[] = await invoke('search_files', {
        query,
        searchPath: this.settings.values.searchPath || undefined,
        maxResults: this.settings.values.maxResults
      })

      const results: SearchResultItem[] = searchResults.map(file => ({
        id: `file-${file.path}`,
        title: file.name,
        description: this.formatFileDescription(file),
        icon: file.is_dir ? FolderIcon : FileIcon,
        priority: this.priority + this.calculateFilePriority(file, query),
        action: () => this.openFile(file.path),
        source: this.id,
        metadata: {
          type: file.is_dir ? 'directory' : 'file',
          path: file.path,
          size: file.size,
          modified: new Date(file.modified * 1000).toISOString()
        }
      }))

      return results
    } catch (error) {
      console.error('文件搜索失败:', error)
      return []
    }
  }

  private formatFileDescription(file: FileSearchResult): string {
    const parts = []
    
    if (file.is_dir) {
      parts.push('目录')
    } else {
      parts.push(this.formatFileSize(file.size))
    }
    
    // 添加修改时间
    const modifiedDate = new Date(file.modified * 1000)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - modifiedDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      parts.push('今天')
    } else if (diffDays === 1) {
      parts.push('昨天')
    } else if (diffDays < 7) {
      parts.push(`${diffDays}天前`)
    } else {
      parts.push(modifiedDate.toLocaleDateString())
    }
    
    // 添加路径
    parts.push(file.path)
    
    return parts.join(' • ')
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  private calculateFilePriority(file: FileSearchResult, query: string): number {
    let priority = 0
    const fileName = file.name.toLowerCase()
    const queryLower = query.toLowerCase()
    
    // 完全匹配
    if (fileName === queryLower) {
      priority += 50
    }
    // 前缀匹配
    else if (fileName.startsWith(queryLower)) {
      priority += 40
    }
    // 包含匹配
    else if (fileName.includes(queryLower)) {
      priority += 30
    }
    
    // 文件类型偏好
    if (file.is_dir) {
      priority += 10 // 目录优先级稍高
    }
    
    // 最近修改的文件优先级更高
    const now = Date.now()
    const daysSinceModified = (now - file.modified * 1000) / (1000 * 60 * 60 * 24)
    if (daysSinceModified < 1) {
      priority += 20
    } else if (daysSinceModified < 7) {
      priority += 15
    } else if (daysSinceModified < 30) {
      priority += 10
    }
    
    return priority
  }

  private async openFile(filePath: string): Promise<void> {
    try {
      // 使用 Tauri 的 shell API 打开文件
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('plugin:opener|open', { path: filePath })
      console.log(`打开文件: ${filePath}`)
    } catch (error) {
      console.error('打开文件失败:', error)
      // 作为备选，可以复制路径到剪贴板
      try {
        await navigator.clipboard.writeText(filePath)
        console.log('文件路径已复制到剪贴板')
      } catch (clipboardError) {
        console.error('复制路径到剪贴板失败:', clipboardError)
      }
    }
  }
}