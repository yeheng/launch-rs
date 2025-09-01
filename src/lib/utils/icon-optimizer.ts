/**
 * 图标优化工具
 * 
 * 提供图标导入优化功能，将静态导入转换为按需导入
 */

import fs from 'fs'
import path from 'path'

// 图标使用分析结果接口
interface IconUsage {
  file: string
  icons: string[]
  importType: 'static' | 'dynamic' | 'mixed'
  estimatedSize: number
}

// 优化建议接口
interface OptimizationSuggestion {
  file: string
  currentImport: string
  suggestedImport: string
  savings: number
  priority: 'high' | 'medium' | 'low'
}

/**
 * 图标优化器类
 */
export class IconOptimizer {
  private projectRoot: string
  private iconUsage: Map<string, IconUsage> = new Map()
  private suggestions: OptimizationSuggestion[] = []

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot
  }

  /**
   * 分析项目中的图标使用情况
   */
  async analyzeIconUsage(): Promise<void> {
    console.log('🔍 分析图标使用情况...')
    
    // 查找所有 TypeScript/JavaScript 文件
    const files = this.findSourceFiles()
    
    for (const file of files) {
      const usage = await this.analyzeFile(file)
      if (usage.icons.length > 0) {
        this.iconUsage.set(file, usage)
      }
    }
    
    console.log(`✅ 分析完成，发现 ${this.iconUsage.size} 个文件使用图标`)
  }

  /**
   * 查找源文件
   */
  private findSourceFiles(): string[] {
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue']
    const files: string[] = []
    
    const searchDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        if (entry.isDirectory()) {
          // 跳过 node_modules 和其他不需要的目录
          if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
            searchDir(fullPath)
          }
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath)
        }
      }
    }
    
    searchDir(this.projectRoot)
    return files
  }

  /**
   * 分析单个文件的图标使用情况
   */
  private async analyzeFile(filePath: string): Promise<IconUsage> {
    const content = fs.readFileSync(filePath, 'utf-8')
    const icons: string[] = []
    let importType: 'static' | 'dynamic' | 'mixed' = 'static'
    
    // 匹配静态导入
    const staticImportRegex = /import\s+{([^}]+)}\s+from\s+['"]lucide-vue-next['"]/g
    const staticImports = content.match(staticImportRegex)
    
    if (staticImports) {
      for (const importStatement of staticImports) {
        const iconsMatch = importStatement.match(/{([^}]+)}/)
        if (iconsMatch) {
          const importedIcons = iconsMatch[1]
            .split(',')
            .map(icon => icon.trim())
            .filter(icon => icon.length > 0)
          
          icons.push(...importedIcons)
        }
      }
    }
    
    // 检查是否有动态导入
    const hasDynamicImport = content.includes('import(') && content.includes('lucide-vue-next')
    if (hasDynamicImport && staticImports) {
      importType = 'mixed'
    } else if (hasDynamicImport) {
      importType = 'dynamic'
    }
    
    // 估算文件大小（基于图标数量）
    const estimatedSize = icons.length * 1024 // 每个图标约 1KB
    
    return {
      file: filePath,
      icons,
      importType,
      estimatedSize
    }
  }

  /**
   * 生成优化建议
   */
  generateOptimizationSuggestions(): OptimizationSuggestion[] {
    console.log('💡 生成优化建议...')
    
    this.suggestions = []
    
    for (const [file, usage] of this.iconUsage) {
      if (usage.importType === 'static') {
        // 为静态导入生成优化建议
        const suggestion = this.generateSuggestionForFile(file, usage)
        if (suggestion) {
          this.suggestions.push(suggestion)
        }
      }
    }
    
    // 按优先级排序
    this.suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
    
    console.log(`✅ 生成 ${this.suggestions.length} 个优化建议`)
    return this.suggestions
  }

  /**
   * 为单个文件生成优化建议
   */
  private generateSuggestionForFile(file: string, usage: IconUsage): OptimizationSuggestion | null {
    if (usage.icons.length === 0) return null
    
    // 生成按需导入代码
    const suggestedImport = this.generateOptimizedImport(usage.icons)
    
    // 计算节省空间（估算）
    const savings = usage.estimatedSize * 0.7 // 假设可以节省 70%
    
    // 确定优先级
    let priority: 'high' | 'medium' | 'low' = 'low'
    if (usage.estimatedSize > 5000) {
      priority = 'high'
    } else if (usage.estimatedSize > 2000) {
      priority = 'medium'
    }
    
    // 获取当前导入语句
    const currentImport = this.getCurrentImport(file)
    
    return {
      file,
      currentImport,
      suggestedImport,
      savings,
      priority
    }
  }

  /**
   * 生成优化后的导入代码
   */
  private generateOptimizedImport(icons: string[]): string {
    // 生成使用图标管理器的导入
    icons.map(icon => {
      const normalizedName = icon.replace(/Icon$/, '')
      return `  ${icon}: ${normalizedName}`
    })
    
    return `// 使用图标管理器按需导入
import { useIcon } from '@/lib/utils/icon-manager'

// 在组件中使用
const { getIcon } = useIcon()

// 预加载图标
await getIcon('${icons[0]}')`
  }

  /**
   * 获取当前导入语句
   */
  private getCurrentImport(file: string): string {
    try {
      const content = fs.readFileSync(file, 'utf-8')
      const importMatch = content.match(/import\s+{[^}]+}\s+from\s+['"]lucide-vue-next['"]/)
      return importMatch ? importMatch[0] : '未找到导入语句'
    } catch {
      return '无法读取文件'
    }
  }

  /**
   * 应用优化建议
   */
  async applyOptimizations(suggestions?: OptimizationSuggestion[]): Promise<void> {
    const suggestionsToApply = suggestions || this.suggestions
    
    console.log(`🚀 应用 ${suggestionsToApply.length} 个优化建议...`)
    
    for (const suggestion of suggestionsToApply) {
      try {
        await this.optimizeFile(suggestion.file)
        console.log(`✅ 优化完成: ${suggestion.file}`)
      } catch (error) {
        console.error(`❌ 优化失败: ${suggestion.file}`, error)
      }
    }
  }

  /**
   * 优化单个文件
   */
  private async optimizeFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8')
    
    // 替换导入语句
    let optimizedContent = content
    
    // 替换静态导入
    optimizedContent = optimizedContent.replace(
      /import\s+{([^}]+)}\s+from\s+['"]lucide-vue-next['"]/g,
      (_match, icons) => {
        icons.split(',').map((icon: string) => icon.trim())
        const useIconImports = icons.split(',').map((icon: string) => {
          const normalizedName = icon.replace(/Icon$/, '')
          return `${icon}: ${normalizedName}`
        }).join(', ')
        
        return `import { useIcon } from '@/lib/utils/icon-manager'
const { getIcon } = useIcon()
// 预加载图标
const icons = { ${useIconImports} }
await Promise.all(Object.values(icons).map(icon => getIcon(icon)))`
      }
    )
    
    // 写入优化后的内容
    fs.writeFileSync(filePath, optimizedContent, 'utf-8')
  }

  /**
   * 生成优化报告
   */
  generateReport(): string {
    let report = '📊 图标优化报告\n\n'
    
    // 总体统计
    const totalFiles = this.iconUsage.size
    const totalIcons = Array.from(this.iconUsage.values()).reduce((sum, usage) => sum + usage.icons.length, 0)
    const staticImportFiles = Array.from(this.iconUsage.values()).filter(usage => usage.importType === 'static').length
    const totalSize = Array.from(this.iconUsage.values()).reduce((sum, usage) => sum + usage.estimatedSize, 0)
    
    report += `📈 总体统计:\n`
    report += `  - 使用图标的文件数: ${totalFiles}\n`
    report += `  - 图标总数: ${totalIcons}\n`
    report += `  - 静态导入文件数: ${staticImportFiles}\n`
    report += `  - 估算总大小: ${this.formatSize(totalSize)}\n\n`
    
    // 按文件统计
    report += `📁 文件详情:\n`
    for (const [file, usage] of this.iconUsage) {
      const relativePath = path.relative(this.projectRoot, file)
      report += `  - ${relativePath}: ${usage.icons.length} 个图标 (${this.formatSize(usage.estimatedSize)})\n`
    }
    
    // 优化建议
    if (this.suggestions.length > 0) {
      report += `\n💡 优化建议:\n`
      for (const suggestion of this.suggestions) {
        const relativePath = path.relative(this.projectRoot, suggestion.file)
        report += `  - ${relativePath}: ${this.formatSize(suggestion.savings)} 节省 (${suggestion.priority} 优先级)\n`
      }
    }
    
    return report
  }

  /**
   * 格式化文件大小
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  /**
   * 获取图标使用统计
   */
  getIconStats() {
    const iconFrequency = new Map<string, number>()
    
    for (const usage of this.iconUsage.values()) {
      for (const icon of usage.icons) {
        iconFrequency.set(icon, (iconFrequency.get(icon) || 0) + 1)
      }
    }
    
    return {
      totalFiles: this.iconUsage.size,
      totalIcons: Array.from(this.iconUsage.values()).reduce((sum, usage) => sum + usage.icons.length, 0),
      mostUsedIcons: Array.from(iconFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
      iconFrequency: Object.fromEntries(iconFrequency)
    }
  }
}

// CLI 接口
export async function runIconOptimizer() {
  const optimizer = new IconOptimizer()
  
  try {
    // 分析图标使用情况
    await optimizer.analyzeIconUsage()
    
    // 生成优化建议
    const suggestions = optimizer.generateOptimizationSuggestions()
    
    // 显示报告
    console.log('\n' + optimizer.generateReport())
    
    // 询问是否应用优化
    if (suggestions.length > 0) {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      })
      
      const answer = await new Promise<string>(resolve => {
        readline.question('\n是否应用优化建议? (y/N): ', resolve)
      })
      
      readline.close()
      
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        await optimizer.applyOptimizations()
        console.log('✅ 优化完成!')
      } else {
        console.log('👋 优化已取消')
      }
    }
  } catch (error) {
    console.error('❌ 优化过程中发生错误:', error)
    process.exit(1)
  }
}

// 如果直接运行此文件，执行优化
if (require.main === module) {
  runIconOptimizer()
}