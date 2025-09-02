/**
 * 文件类型分类和标签生成
 */

import type { IndexEntry, DirectoryEntry } from './types'
import { FileType } from './types'

/**
 * 根据文件扩展名确定文件类型
 */
export function determineFileType(filename: string, extension: string): FileType {
  const ext = extension.toLowerCase()
  
  // 文档类型
  const documentExts = [
    'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'pages', 'md', 'markdown',
    'tex', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'json', 'xml', 'html', 'htm'
  ]
  
  // 图片类型
  const imageExts = [
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg', 'ico'
  ]
  
  // 视频类型
  const videoExts = [
    'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v', '3gp'
  ]
  
  // 音频类型
  const audioExts = [
    'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus'
  ]
  
  // 代码类型
  const codeExts = [
    'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'hpp', 'cs', 'php',
    'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'sh', 'bash', 'sql', 'css', 'scss',
    'sass', 'less', 'vue', 'html', 'xml', 'json', 'yaml', 'yml', 'toml', 'ini'
  ]
  
  // 压缩包类型
  const archiveExts = [
    'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'dmg', 'iso'
  ]
  
  // 可执行文件类型
  const executableExts = [
    'exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'app', 'appimage', 'run'
  ]
  
  // 系统文件类型
  const systemExts = [
    'dll', 'so', 'dylib', 'a', 'lib', 'sys', 'drv', 'bin', 'o'
  ]
  
  if (documentExts.includes(ext)) return FileType.DOCUMENT
  if (imageExts.includes(ext)) return FileType.IMAGE
  if (videoExts.includes(ext)) return FileType.VIDEO
  if (audioExts.includes(ext)) return FileType.AUDIO
  if (codeExts.includes(ext)) return FileType.CODE
  if (archiveExts.includes(ext)) return FileType.ARCHIVE
  if (executableExts.includes(ext)) return FileType.EXECUTABLE
  if (systemExts.includes(ext)) return FileType.SYSTEM
  
  return FileType.OTHER
}

/**
 * 为文件生成智能标签
 */
export function generateFileTags(entry: DirectoryEntry): string[] {
  const tags: string[] = []

  // 基于文件类型生成标签
  if (entry.type === 'file') {
    const extension = getExtension(entry.name)
    tags.push(`file:${extension || 'none'}`)

    // 基于文件大小生成标签
    if (entry.size) {
      if (entry.size < 1024) {
        tags.push('size:small')
      } else if (entry.size < 1024 * 1024) {
        tags.push('size:medium')
      } else {
        tags.push('size:large')
      }
    }
  } else {
    tags.push('type:directory')
  }

  // 基于文件名模式生成标签
  const nameLower = entry.name.toLowerCase()
  
  // 项目相关标签
  if (nameLower.includes('test') || nameLower.includes('spec')) {
    tags.push('category:test')
  }
  if (nameLower.includes('config') || nameLower.includes('cfg')) {
    tags.push('category:config')
  }
  if (nameLower.includes('readme') || nameLower.includes('doc')) {
    tags.push('category:documentation')
  }
  
  // 开发相关标签
  if (nameLower.includes('package.json') || nameLower.includes('cargo.toml')) {
    tags.push('dev:package')
  }
  if (nameLower.includes('index') || nameLower.includes('main')) {
    tags.push('dev:entrypoint')
  }
  if (nameLower.includes('util') || nameLower.includes('helper')) {
    tags.push('dev:utility')
  }
  
  // 数据相关标签
  if (nameLower.includes('data') || nameLower.includes('db')) {
    tags.push('category:data')
  }
  if (nameLower.includes('log')) {
    tags.push('category:log')
  }
  
  // 安全相关标签
  if (nameLower.includes('secret') || nameLower.includes('key') || nameLower.includes('token')) {
    tags.push('security:sensitive')
  }

  return tags
}

/**
 * 获取文件扩展名
 */
export function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot === -1 ? '' : filename.substring(lastDot + 1)
}

/**
 * 计算文件类型偏好权重
 */
export function getFileTypePreferenceWeight(fileType: FileType): number {
  const preferences = {
    [FileType.DOCUMENT]: 8,
    [FileType.CODE]: 7,
    [FileType.IMAGE]: 5,
    [FileType.OTHER]: 3,
    [FileType.VIDEO]: 4,
    [FileType.AUDIO]: 4,
    [FileType.ARCHIVE]: 2,
    [FileType.EXECUTABLE]: 2,
    [FileType.SYSTEM]: 1
  }
  
  return preferences[fileType] || 0
}