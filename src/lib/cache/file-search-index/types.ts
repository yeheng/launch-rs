/**
 * 文件搜索索引类型定义
 */

export enum FileType {
  DOCUMENT = 'document',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  CODE = 'code',
  ARCHIVE = 'archive',
  EXECUTABLE = 'executable',
  SYSTEM = 'system',
  OTHER = 'other'
}

export enum SearchStrategy {
  EXACT = 'exact',
  PREFIX = 'prefix', 
  FUZZY = 'fuzzy',
  HYBRID = 'hybrid'
}

export enum MatchType {
  EXACT = 'exact',
  PREFIX = 'prefix',
  CONTAIN = 'contain',
  FUZZY = 'fuzzy'
}

/**
 * 索引条目接口
 */
export interface IndexEntry {
  /** 文件路径 */
  path: string
  /** 文件名 */
  name: string
  /** 文件扩展名 */
  extension: string
  /** 文件大小（字节） */
  size: number
  /** 修改时间 */
  modifiedTime: number
  /** 文件类型 */
  type: 'file' | 'directory'
  /** 权限标记 */
  permissions?: string
  /** 文件所有者 */
  owner?: string
  /** 文件组 */
  group?: string
  /** 内容哈希（用于重复检测） */
  contentHash?: string
  /** 文件标签/关键词 */
  tags: string[]
  /** 访问频率 */
  accessCount: number
  /** 最后访问时间 */
  lastAccessed: number
  /** 文件类型分类 */
  category: FileType
  /** 搜索权重 */
  weight: number
}

/**
 * 目录条目（用于文件系统遍历）
 */
export interface DirectoryEntry {
  name: string
  type: 'file' | 'directory'
  size?: number
  modifiedTime?: number
  permissions?: string
  owner?: string
  group?: string
}