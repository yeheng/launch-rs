/**
 * Vite 图标优化插件
 * 
 * 自动优化 lucide-vue-next 图标的导入，实现按需加载
 */

import type { Plugin } from 'vite'

interface IconOptimizationOptions {
  /** 是否启用优化 */
  enabled?: boolean
  /** 包含的文件模式 */
  include?: string[]
  /** 排除的文件模式 */
  exclude?: string[]
  /** 预加载的图标 */
  preloadIcons?: string[]
}

export function iconOptimization(options: IconOptimizationOptions = {}): Plugin {
  const {
    enabled = true,
    include = ['**/*.vue', '**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    exclude = ['node_modules/**', 'dist/**'],
    preloadIcons = []
  } = options

  if (!enabled) {
    return {
      name: 'icon-optimization',
      resolveId() {
        return null
      }
    }
  }

  return {
    name: 'icon-optimization',
    enforce: 'pre',

    configResolved(config) {
      // 添加优化配置
      config.build.rollupOptions = config.build.rollupOptions || {}
      config.build.rollupOptions.output = config.build.rollupOptions.output || {}
      
      if (Array.isArray(config.build.rollupOptions.output)) {
        config.build.rollupOptions.output.forEach(output => {
          output.manualChunks = output.manualChunks || {}
          ;(output.manualChunks as any)['lucide-vue-next'] = ['lucide-vue-next']
        })
      } else {
        config.build.rollupOptions.output.manualChunks = {
          ...config.build.rollupOptions.output.manualChunks,
          'lucide-vue-next': ['lucide-vue-next']
        }
      }
    },

    transform(code, id) {
      // 检查文件是否在处理范围内
      const shouldProcess = include.some(pattern => 
        id.includes(pattern.replace('**', ''))
      ) && !exclude.some(pattern => 
        id.includes(pattern.replace('**', ''))
      )

      if (!shouldProcess) {
        return null
      }

      // 检测 lucide-vue-next 的静态导入
      const staticImportRegex = /import\s+{([^}]+)}\s+from\s+['"]lucide-vue-next['"]/g
      const matches = [...code.matchAll(staticImportRegex)]

      if (matches.length === 0) {
        return null
      }

      let transformedCode = code

      // 替换静态导入为动态导入
      for (const match of matches) {
        const [fullMatch, iconsStr] = match
        const icons = iconsStr.split(',').map(icon => icon.trim())
        
        // 生成动态导入代码
        const dynamicImportCode = generateDynamicImport(icons, preloadIcons)
        
        // 替换原代码
        transformedCode = transformedCode.replace(fullMatch, dynamicImportCode)
      }

      return {
        code: transformedCode,
        map: null
      }
    },

    generateBundle() {
      // 生成图标使用报告
      this.emitFile({
        type: 'asset',
        fileName: 'icon-optimization-report.json',
        source: JSON.stringify({
          optimized: true,
          preloadIcons,
          timestamp: new Date().toISOString()
        }, null, 2)
      })
    }
  }
}

/**
 * 生成动态导入代码
 */
function generateDynamicImport(icons: string[], preloadIcons: string[]): string {
  const iconMap = icons.map(icon => {
    const normalizedName = icon.replace(/Icon$/, '')
    return `  ${icon}: ${normalizedName}`
  }).join(',\n')

  const preloadCode = preloadIcons.length > 0 
    ? `// 预加载常用图标
const { preloadIcons } = await import('@/lib/utils/icon-manager')
await preloadIcons([${preloadIcons.map(icon => `'${icon}'`).join(', ')}])`
    : ''

  return `// 图标按需导入
import { useIcon } from '@/lib/utils/icon-manager'

${preloadCode}

// 动态加载图标
const { getIcon } = useIcon()
const icons = { ${iconMap} }

// 按需加载图标
await Promise.all(
  Object.entries(icons).map(async ([key, iconName]) => {
    icons[key] = await getIcon(iconName)
  }))
`
}

/**
 * 图标分析工具
 */
export class IconAnalyzer {
  private iconUsage: Map<string, Set<string>> = new Map()

  analyzeImport(code: string, filePath: string): void {
    const staticImportRegex = /import\s+{([^}]+)}\s+from\s+['"]lucide-vue-next['"]/g
    const matches = [...code.matchAll(staticImportRegex)]

    for (const match of matches) {
      const [, iconsStr] = match
      const icons = iconsStr.split(',').map(icon => icon.trim())

      for (const icon of icons) {
        if (!this.iconUsage.has(icon)) {
          this.iconUsage.set(icon, new Set())
        }
        this.iconUsage.get(icon)!.add(filePath)
      }
    }
  }

  getUsageStats(): {
    totalIcons: number
    totalFiles: number
    mostUsedIcons: Array<{ icon: string; files: string[]; usageCount: number }>
    iconFrequency: Record<string, number>
  } {
    const iconFrequency: Record<string, number> = {}
    const fileUsage: Record<string, Set<string>> = {}

    for (const [icon, files] of this.iconUsage) {
      iconFrequency[icon] = files.size
      
      for (const file of files) {
        if (!fileUsage[file]) {
          fileUsage[file] = new Set()
        }
        fileUsage[file].add(icon)
      }
    }

    const mostUsedIcons = Object.entries(iconFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([icon, usageCount]) => ({
        icon,
        files: Array.from(this.iconUsage.get(icon) || []),
        usageCount
      }))

    return {
      totalIcons: this.iconUsage.size,
      totalFiles: Object.keys(fileUsage).length,
      mostUsedIcons,
      iconFrequency
    }
  }

  generateOptimizationSuggestions(): Array<{
    icon: string
    usageCount: number
    suggestion: 'preload' | 'dynamic' | 'remove'
    reason: string
  }> {
    const stats = this.getUsageStats()
    const suggestions: Array<{
      icon: string
      usageCount: number
      suggestion: 'preload' | 'dynamic' | 'remove'
      reason: string
    }> = []

    for (const { icon, usageCount } of stats.mostUsedIcons) {
      if (usageCount >= 5) {
        suggestions.push({
          icon,
          usageCount,
          suggestion: 'preload',
          reason: `高使用频率 (${usageCount} 次)，建议预加载`
        })
      } else if (usageCount >= 2) {
        suggestions.push({
          icon,
          usageCount,
          suggestion: 'dynamic',
          reason: `中等使用频率 (${usageCount} 次)，建议动态加载`
        })
      } else {
        suggestions.push({
          icon,
          usageCount,
          suggestion: 'dynamic',
          reason: `低使用频率 (${usageCount} 次)，建议动态加载`
        })
      }
    }

    return suggestions
  }
}