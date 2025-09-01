import { useIcon, ICON_MAP } from '@/lib/utils/icon-manager'
import type { SearchContext, SearchPlugin, SearchResultItem } from '../../search-plugins'
import { logger } from '../../logger'
import { handlePluginError } from '../../error-handler'
import { permissionManager } from '../../security/permission-manager'
import { InputValidator } from '../../security/input-validator'
import { FileSearchIndex } from '../../cache/file-search-index'
import { withSearchCache } from '../../cache/search-cache'

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
  icon: any = null // 将在初始化时动态加载
  version = '1.0.0'
  enabled = true
  priority = 80
  searchPrefixes = ['file:', 'files:', 'f:']

  // 文件搜索索引实例
  private searchIndex: FileSearchIndex
  // 索引初始化状态
  private indexInitialized = false
  // 图标缓存
  private fileIcon: any = null
  private folderIcon: any = null

  constructor() {
    // 创建文件搜索索引实例
    this.searchIndex = new FileSearchIndex({
      updateInterval: 5 * 60 * 1000, // 5分钟
      maxEntries: 1000,
      maxDepth: 3,
      includedExtensions: [],
      excludedExtensions: [],
      excludedDirectories: ['.git', 'node_modules', '.vscode'],
      enableContentIndex: false,
      contentIndexMinSize: 0,
      contentIndexMaxSize: 1024 * 1024, // 1MB
      search: {
        fuzzyThreshold: 0.6,
        prefixWeight: 0.8,
        containWeight: 0.6,
        typePreferenceWeight: 0.3,
        accessWeight: 0.3,
        predictionWeight: 0.2
      },
      performance: {
        concurrentIndexing: 2,
        batchSize: 50,
        memoryLimit: 50,
        enableCompression: true
      }
    })
  }

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
    const { getIcon } = useIcon()
    try {
      // 动态加载图标
      this.fileIcon = await getIcon(ICON_MAP.File)
      this.folderIcon = await getIcon(ICON_MAP.Folder)
      this.icon = this.fileIcon // 设置默认图标
      
      // 构建初始索引
      const searchPath = this.settings.values.searchPath || undefined
      await this.buildSearchIndex(searchPath)
      
      this.indexInitialized = true
      logger.info('文件搜索插件初始化完成')
    } catch (error) {
      const appError = handlePluginError('文件搜索插件初始化', error)
      logger.error('文件搜索插件初始化失败', appError)
      // 索引构建失败不应阻止插件工作，只是使用回退模式
    }
  }

  // 带缓存的搜索方法
  private cachedSearch = withSearchCache('files', this.performSearch.bind(this))
  
  async search(context: SearchContext): Promise<SearchResultItem[]> {
    return this.cachedSearch(context)
  }

  /**
   * 执行搜索的核心逻辑
   */
  private async performSearch(context: SearchContext): Promise<SearchResultItem[]> {
    const { query } = context
    
    // 输入验证
    const validationResult = InputValidator.validateSearchQuery(query)
    if (!validationResult.isValid) {
      logger.warn('文件搜索查询验证失败', { 
        query, 
        errors: validationResult.errors 
      })
      return []
    }

    // 使用清理后的查询
    const sanitizedQuery = validationResult.sanitized
    
    if (sanitizedQuery.length < 2) {
      return [] // 避免过短查询导致过多结果
    }

    // 记录验证警告
    if (validationResult.warnings.length > 0) {
      logger.info('文件搜索查询验证警告', { 
        query, 
        warnings: validationResult.warnings 
      })
    }

    try {
      let searchResults: FileSearchResult[]
      
      // 优先使用增强的搜索索引
      if (this.indexInitialized) {
        try {
          // 使用增强搜索索引
          const enhancedResults = await this.searchIndex.search(sanitizedQuery, {
            maxResults: this.settings.values.maxResults,
            searchType: 'smart' as const,
            includeContent: false,
            sortBy: 'relevance' as const,
            sortOrder: 'desc' as const
          })
          
          // 转换为标准文件搜索结果格式
          searchResults = enhancedResults.map(result => ({
            name: result.entry.name,
            path: result.entry.path,
            is_dir: result.entry.type === 'directory',
            size: result.entry.size,
            modified: Math.floor(result.entry.modifiedTime / 1000)
          }))
        } catch (indexError) {
          logger.warn('搜索索引失败，回退到原始搜索', { error: indexError })
          searchResults = await this.performOriginalSearch(sanitizedQuery)
        }
      } else {
        // 回退到原始搜索方法
        searchResults = await this.performOriginalSearch(sanitizedQuery)
      }

      const results: SearchResultItem[] = searchResults.map(file => ({
        id: `file-${file.path}`,
        title: file.name,
        description: this.formatFileDescription(file),
        icon: file.is_dir ? (this.folderIcon || this.fileIcon) : this.fileIcon,
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
      const appError = handlePluginError('文件搜索', error)
      logger.error('文件搜索失败', appError)
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
      logger.info(`打开文件: ${filePath}`)
    } catch (error) {
      const appError = handlePluginError('打开文件', error)
      logger.error('打开文件失败', appError)
      // 作为备选，可以复制路径到剪贴板
      try {
        // 请求剪贴板访问权限
        const hasPermission = await permissionManager.requestClipboardAccess('file-plugin')
        if (hasPermission) {
          await navigator.clipboard.writeText(filePath)
          logger.info('文件路径已复制到剪贴板')
        } else {
          logger.warn('用户拒绝了剪贴板访问权限，无法复制文件路径')
        }
      } catch (clipboardError) {
        const clipboardAppError = handlePluginError('复制路径到剪贴板', clipboardError)
        logger.error('复制路径到剪贴板失败', clipboardAppError)
      }
    }
  }

  /**
   * 原始搜索方法（作为回退方案）
   */
  private async performOriginalSearch(query: string): Promise<FileSearchResult[]> {
    const { invoke } = await import('@tauri-apps/api/core')
    
    return await invoke('search_files', {
      query,
      searchPath: this.settings.values.searchPath || undefined,
      maxResults: this.settings.values.maxResults
    })
  }

  
  /**
   * 构建搜索索引
   */
  private async buildSearchIndex(searchPath?: string): Promise<void> {
    try {
      // 使用FileSearchIndex的buildIndex方法
      await this.searchIndex.buildIndex(searchPath || process.cwd())
      logger.info('文件搜索索引构建完成')
    } catch (error) {
      const appError = handlePluginError('构建搜索索引', error)
      logger.error('构建搜索索引失败', appError)
      // 索引构建失败不应阻止插件工作，只是使用回退模式
    }
  }

  
  /**
   * 更新搜索索引（在设置变更时调用）
   */
  async updateSearchIndex(): Promise<void> {
    if (!this.indexInitialized) {
      return
    }
    
    try {
      // 清除现有索引
      this.searchIndex.clearIndex()
      
      // 重新构建索引
      await this.buildSearchIndex(this.settings.values.searchPath || undefined)
      
      logger.info('文件搜索索引更新完成')
    } catch (error) {
      const appError = handlePluginError('更新搜索索引', error)
      logger.error('更新搜索索引失败', appError)
    }
  }

  /**
   * 获取索引统计信息
   */
  getIndexStatistics() {
    return this.searchIndex.getStatistics()
  }
}