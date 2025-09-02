import { logger } from '../../logger'
import type { SearchContext, SearchResultItem } from '../../search-plugins'
import { createPrefixPlugin, createSimplePlugin, definePlugin } from '../define-plugin'

/**
 * 使用 definePlugin 创建的示例插件
 * 展示工厂函数的各种功能
 */

// 1. 基础插件示例
export const helloWorldPlugin = definePlugin({
  id: 'hello-world',
  name: 'Hello World',
  description: '一个简单的问候插件',
  version: '1.0.0',
  enabled: true,
  priority: 30,
  
  // 初始化函数
  initialize: async (plugin) => {
    logger.info('Hello World 插件初始化')
    // 存储一些私有数据
    plugin.setPrivateData('greetings', ['Hello', 'Hi', 'Hey'])
  },

  // 搜索函数
  search: async (context: SearchContext, plugin): Promise<SearchResultItem[]> => {
    const { queryLower } = context
    const greetings = plugin.getPrivateData<string[]>('greetings') || ['Hello']
    
    if (queryLower.includes('hello') || queryLower.includes('hi')) {
      return [{
        id: 'hello-world',
        title: 'Hello World!',
        description: '这是一个示例插件的搜索结果',
        icon: null,
        priority: plugin.priority,
        action: () => {
          logger.info('Hello World 被点击了!')
        },
        source: plugin.id,
        metadata: {
          type: 'example',
          greetings
        }
      }]
    }
    
    return []
  },

  // 事件监听器
  eventListeners: [
    {
      event: 'search:start',
      listener: (query: string) => {
        logger.info(`Hello World 插件监听到搜索开始: ${query}`)
      }
    }
  ],

  // 元数据
  metadata: {
    author: 'Claude',
    license: 'MIT',
    category: 'example',
    tags: ['hello', 'world', 'example']
  }
})

// 2. 使用便捷函数创建的简单插件
export const simplePlugin = createSimplePlugin({
  id: 'simple-counter',
  name: '简单计数器',
  description: '一个简单的计数器插件',
  
  search: (context: SearchContext, plugin): SearchResultItem[] => {
    if (context.queryLower.includes('count') || context.queryLower.includes('计数')) {
      const currentCount = plugin.getPrivateData('count') || 0
      const newCount = currentCount + 1
      plugin.setPrivateData('count', newCount)
      
      return [{
        id: 'counter-result',
        title: `计数器: ${newCount}`,
        description: `这是第 ${newCount} 次计数`,
        icon: null,
        priority: plugin.priority,
        action: () => {
          logger.info(`计数器值: ${newCount}`)
        },
        source: plugin.id,
        metadata: {
          type: 'counter',
          count: newCount
        }
      }]
    }
    
    return []
  }
})

// 3. 前缀插件示例
export const calcPlugin = createPrefixPlugin('calc:', {
  id: 'quick-calculator',
  name: '快速计算器',
  description: '使用 calc: 前缀进行快速计算',
  priority: 85,
  
  settings: {
    schema: [
      {
        key: 'precision',
        label: '计算精度',
        description: '小数点后的位数',
        type: 'number',
        defaultValue: 2
      }
    ],
    values: {
      precision: 2
    },
    onChange: (key: string, value: any) => {
      logger.info(`计算器设置变更: ${key} = ${value}`)
    }
  },
  
  search: (context: SearchContext, plugin): SearchResultItem[] => {
    const { query, queryLower, keywords } = context
    
    // 检查是否有 calc: 前缀
    if (queryLower.startsWith('calc:')) {
      const expression = query.substring(5).trim()
      
      if (expression) {
        try {
          // 简单的计算器实现
          const result = evaluateSimpleExpression(expression)
          const precision = plugin.settings?.values.precision || 2
          const formattedResult = typeof result === 'number' 
            ? result.toFixed(precision) 
            : result.toString()
          
          return [{
            id: `calc-${Date.now()}`,
            title: `= ${formattedResult}`,
            description: `计算结果: ${expression}`,
            icon: null,
            priority: plugin.priority + 10,
            action: () => {
              logger.info(`计算结果: ${expression} = ${formattedResult}`)
            },
            source: plugin.id,
            metadata: {
              type: 'calculation',
              expression,
              result: formattedResult
            }
          }]
        } catch (error) {
          return [{
            id: `calc-error-${Date.now()}`,
            title: '计算错误',
            description: `无法计算表达式: ${expression}`,
            icon: null,
            priority: plugin.priority,
            action: () => {},
            source: plugin.id,
            metadata: {
              type: 'calculation-error',
              expression,
              error: error instanceof Error ? error.message : '未知错误'
            }
          }]
        }
      }
    }
    
    return []
  }
})

// 4. 带有错误处理和状态管理的复杂插件
export const smartSearchPlugin = definePlugin({
  id: 'smart-search',
  name: '智能搜索',
  description: '具有学习和适应能力的智能搜索插件',
  version: '2.0.0',
  enabled: true,
  priority: 95,
  searchPrefixes: ['smart:', 'ai:'],
  
  initialize: async (plugin) => {
    logger.info('智能搜索插件初始化中...')
    
    // 初始化学习数据
    plugin.setPrivateData('searchHistory', [])
    plugin.setPrivateData('learningData', new Map())
    plugin.setPrivateData('performanceMetrics', {
      totalSearches: 0,
      averageResponseTime: 0,
      successRate: 100
    })
    
    // 模拟异步初始化
    await new Promise(resolve => setTimeout(resolve, 100))
    
    logger.info('智能搜索插件初始化完成')
  },
  
  search: async (context: SearchContext, plugin): Promise<SearchResultItem[]> => {
    const startTime = Date.now()
    const { query, queryLower, keywords } = context
    
    try {
      // 记录搜索历史
      const history = plugin.getPrivateData<Array<{query: string, timestamp: number}>>('searchHistory') || []
      history.push({ query, timestamp: Date.now() })
      plugin.setPrivateData('searchHistory', history.slice(-100)) // 保留最近100条
      
      // 模拟智能搜索逻辑
      const results: SearchResultItem[] = []
      
      // 基于关键词匹配
      if (keywords.length > 0) {
        results.push({
          id: `smart-${Date.now()}-1`,
          title: `智能结果: ${keywords.join(' ')}`,
          description: `基于关键词 "${keywords.join(', ')}" 的智能搜索结果`,
          icon: null,
          priority: plugin.priority + 20,
          action: () => {
            logger.info(`智能搜索结果被点击: ${keywords.join(' ')}`)
          },
          source: plugin.id,
          metadata: {
            type: 'smart-result',
            keywords,
            confidence: 0.85
          }
        })
      }
      
      // 基于历史学习的推荐
      const learningData = plugin.getPrivateData<Map<string, number>>('learningData') || new Map()
      for (const keyword of keywords) {
        const currentScore = learningData.get(keyword) || 0
        learningData.set(keyword, currentScore + 1)
      }
      plugin.setPrivateData('learningData', learningData)
      
      // 更新性能指标
      const metrics = plugin.getPrivateData('performanceMetrics') as any
      metrics.totalSearches++
      const responseTime = Date.now() - startTime
      metrics.averageResponseTime = (metrics.averageResponseTime * (metrics.totalSearches - 1) + responseTime) / metrics.totalSearches
      
      plugin.setPrivateData('performanceMetrics', metrics)
      
      return results
    } catch (error) {
      logger.error('智能搜索插件搜索失败', error)
      return []
    }
  },
  
  destroy: async (plugin) => {
    logger.info('智能搜索插件销毁中...')
    
    // 保存学习数据到持久化存储（这里只是示例）
    const learningData = plugin.getPrivateData('learningData')
    const metrics = plugin.getPrivateData('performanceMetrics')
    
    logger.info(`保存学习数据: ${learningData?.size || 0} 个关键词`)
    logger.info(`性能指标: ${JSON.stringify(metrics)}`)
    
    logger.info('智能搜索插件已销毁')
  },
  
  metadata: {
    author: 'AI Assistant',
    license: 'Apache-2.0',
    category: 'ai',
    tags: ['smart', 'ai', 'learning', 'adaptive'],
    permissions: ['search-history', 'learning-data']
  }
})

// 辅助函数：简单表达式求值
function evaluateSimpleExpression(expression: string): number {
  // 移除所有空格
  const cleanExpression = expression.replace(/\s+/g, '')
  
  // 只支持基本的数学运算
  if (!/^[\d+\-*/().]+$/.test(cleanExpression)) {
    throw new Error('无效的表达式')
  }
  
  try {
    // 使用 Function 构造函数安全地计算表达式
    return Function('"use strict"; return (' + cleanExpression + ')')()
  } catch (error) {
    throw new Error('表达式计算失败')
  }
}

// 导出所有示例插件
export const examplePlugins = [
  helloWorldPlugin,
  simplePlugin,
  calcPlugin,
  smartSearchPlugin
]