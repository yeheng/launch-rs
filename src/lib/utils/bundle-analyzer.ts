/**
 * Bundle 分析工具
 * 
 * 分析和监控应用包大小，提供优化建议
 */

import fs from 'fs'
import path from 'path'

interface BundleAnalysis {
  totalSize: number
  chunkSizes: Record<string, number>
  iconUsage: Record<string, number>
  largestChunks: Array<{ name: string; size: number; percentage: number }>
  optimizationSuggestions: string[]
}


export class BundleAnalyzer {
  private projectRoot: string
  private distPath: string

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot
    this.distPath = path.join(projectRoot, 'dist')
  }

  /**
   * 分析包大小
   */
  async analyzeBundle(): Promise<BundleAnalysis> {
    console.log('🔍 分析包大小...')

    const analysis: BundleAnalysis = {
      totalSize: 0,
      chunkSizes: {},
      iconUsage: {},
      largestChunks: [],
      optimizationSuggestions: []
    }

    try {
      // 分析构建输出
      if (fs.existsSync(this.distPath)) {
        const chunkSizes = this.analyzeChunkSizes()
        analysis.chunkSizes = chunkSizes
        analysis.totalSize = Object.values(chunkSizes).reduce((sum, size) => sum + size, 0)
        
        // 找出最大的 chunks
        analysis.largestChunks = this.getLargestChunks(chunkSizes)
      }

      // 分析图标使用情况
      analysis.iconUsage = await this.analyzeIconUsage()

      // 生成优化建议
      analysis.optimizationSuggestions = this.generateOptimizationSuggestions(analysis)

      return analysis
    } catch (error) {
      console.error('❌ 包分析失败:', error)
      throw error
    }
  }

  /**
   * 分析 chunk 大小
   */
  private analyzeChunkSizes(): Record<string, number> {
    const chunkSizes: Record<string, number> = {}

    const analyzeDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          analyzeDir(fullPath)
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.css'))) {
          const stats = fs.statSync(fullPath)
          const relativePath = path.relative(this.distPath, fullPath)
          chunkSizes[relativePath] = stats.size
        }
      }
    }

    if (fs.existsSync(this.distPath)) {
      analyzeDir(this.distPath)
    }

    return chunkSizes
  }

  /**
   * 获取最大的 chunks
   */
  private getLargestChunks(chunkSizes: Record<string, number>): Array<{ name: string; size: number; percentage: number }> {
    const totalSize = Object.values(chunkSizes).reduce((sum, size) => sum + size, 0)
    
    return Object.entries(chunkSizes)
      .map(([name, size]) => ({
        name,
        size,
        percentage: totalSize > 0 ? (size / totalSize) * 100 : 0
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
  }

  /**
   * 分析图标使用情况
   */
  private async analyzeIconUsage(): Promise<Record<string, number>> {
    try {
      // 使用之前创建的图标分析器
      const { IconAnalyzer } = await import('./vite-icon-optimization')
      const analyzer = new IconAnalyzer()

      // 分析所有源文件
      const sourceFiles = this.findSourceFiles()
      
      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        analyzer.analyzeImport(content, file)
      }

      const stats = analyzer.getUsageStats()
      return stats.iconFrequency
    } catch (error) {
      console.warn('图标使用分析失败:', error)
      return {}
    }
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
   * 生成优化建议
   */
  private generateOptimizationSuggestions(analysis: BundleAnalysis): string[] {
    const suggestions: string[] = []

    // 基于包大小的建议
    if (analysis.totalSize > 2 * 1024 * 1024) { // 2MB
      suggestions.push('📦 包体积较大，建议启用代码分割和压缩')
    }

    // 基于图标使用的建议
    const iconCount = Object.keys(analysis.iconUsage).length
    if (iconCount > 20) {
      suggestions.push('🎨 图标使用较多，建议实施按需加载策略')
    }

    // 基于最大 chunk 的建议
    const largestChunk = analysis.largestChunks[0]
    if (largestChunk && largestChunk.percentage > 30) {
      suggestions.push(`🗂️ ${largestChunk.name} 占比过大 (${largestChunk.percentage.toFixed(1)}%)，建议拆分`)
    }

    // 特定库的优化建议
    if (analysis.chunkSizes['assets/lucide-vue-next-*.js']) {
      suggestions.push('🎯 检测到 lucide-vue-next，建议使用图标按需导入')
    }

    return suggestions
  }

  /**
   * 生成分析报告
   */
  generateReport(analysis: BundleAnalysis): string {
    let report = '📊 Bundle 分析报告\n\n'

    // 总体统计
    report += `📈 总体统计:\n`
    report += `  - 总包大小: ${this.formatSize(analysis.totalSize)}\n`
    report += `  - Chunk 数量: ${Object.keys(analysis.chunkSizes).length}\n`
    report += `  - 图标种类: ${Object.keys(analysis.iconUsage).length}\n\n`

    // 最大的 chunks
    report += `🔍 最大的 Chunks:\n`
    analysis.largestChunks.slice(0, 5).forEach((chunk, index) => {
      report += `  ${index + 1}. ${chunk.name}: ${this.formatSize(chunk.size)} (${chunk.percentage.toFixed(1)}%)\n`
    })
    report += '\n'

    // 图标使用情况
    if (Object.keys(analysis.iconUsage).length > 0) {
      report += `🎨 图标使用情况:\n`
      const sortedIcons = Object.entries(analysis.iconUsage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
      
      sortedIcons.forEach(([icon, count]) => {
        report += `  - ${icon}: ${count} 次使用\n`
      })
      report += '\n'
    }

    // 优化建议
    if (analysis.optimizationSuggestions.length > 0) {
      report += `💡 优化建议:\n`
      analysis.optimizationSuggestions.forEach(suggestion => {
        report += `  ${suggestion}\n`
      })
    }

    return report
  }

  /**
   * 格式化文件大小
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
  }

  /**
   * 比较两次构建的差异
   */
  async compareBuilds(beforePath: string, afterPath: string): Promise<{
    added: Array<{ name: string; size: number }>
    removed: Array<{ name: string; size: number }>
    changed: Array<{ name: string; beforeSize: number; afterSize: number; difference: number }>
    totalSizeChange: number
  }> {
    const beforeSizes = this.getChunkSizesFromPath(beforePath)
    const afterSizes = this.getChunkSizesFromPath(afterPath)

    const added: Array<{ name: string; size: number }> = []
    const removed: Array<{ name: string; size: number }> = []
    const changed: Array<{ name: string; beforeSize: number; afterSize: number; difference: number }> = []

    const allNames = new Set([...Object.keys(beforeSizes), ...Object.keys(afterSizes)])

    for (const name of allNames) {
      const beforeSize = beforeSizes[name] || 0
      const afterSize = afterSizes[name] || 0

      if (beforeSize === 0 && afterSize > 0) {
        added.push({ name, size: afterSize })
      } else if (afterSize === 0 && beforeSize > 0) {
        removed.push({ name, size: beforeSize })
      } else if (beforeSize !== afterSize) {
        changed.push({
          name,
          beforeSize,
          afterSize,
          difference: afterSize - beforeSize
        })
      }
    }

    const totalBeforeSize = Object.values(beforeSizes).reduce((sum, size) => sum + size, 0)
    const totalAfterSize = Object.values(afterSizes).reduce((sum, size) => sum + size, 0)

    return {
      added,
      removed,
      changed,
      totalSizeChange: totalAfterSize - totalBeforeSize
    }
  }

  /**
   * 从路径获取 chunk 大小
   */
  private getChunkSizesFromPath(distPath: string): Record<string, number> {
    const chunkSizes: Record<string, number> = {}

    if (!fs.existsSync(distPath)) {
      return chunkSizes
    }

    const analyzeDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          analyzeDir(fullPath)
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.css'))) {
          const stats = fs.statSync(fullPath)
          const relativePath = path.relative(distPath, fullPath)
          chunkSizes[relativePath] = stats.size
        }
      }
    }

    analyzeDir(distPath)
    return chunkSizes
  }
}

// CLI 接口
export async function runBundleAnalysis() {
  const analyzer = new BundleAnalyzer()

  try {
    const analysis = await analyzer.analyzeBundle()
    console.log('\n' + analyzer.generateReport(analysis))

    // 询问是否要查看详细信息
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer = await new Promise<string>(resolve => {
      readline.question('\n是否保存详细报告到文件? (y/N): ', resolve)
    })

    readline.close()

    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      const reportPath = path.join(process.cwd(), 'bundle-analysis-report.json')
      fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2))
      console.log(`✅ 详细报告已保存到: ${reportPath}`)
    }
  } catch (error) {
    console.error('❌ Bundle 分析失败:', error)
    process.exit(1)
  }
}

// 如果直接运行此文件，执行分析
if (require.main === module) {
  runBundleAnalysis()
}