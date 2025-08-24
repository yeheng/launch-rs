import { Calculator } from 'lucide-vue-next'
import type { SearchContext, SearchPlugin, SearchResultItem } from '../search-plugins'

/**
 * 计算器搜索插件
 */
export class CalculatorPlugin implements SearchPlugin {
  id = 'calculator'
  name = '计算器'
  description = '计算数学表达式'
  icon = Calculator
  version = '1.0.0'
  enabled = true
  priority = 90
  searchPrefixes = ['calc:', 'calculate:', '=']

  settings = {
    schema: [
      {
        key: 'precision',
        label: '小数精度',
        description: '计算结果保留的小数位数',
        type: 'number' as const,
        defaultValue: 10
      },
      {
        key: 'enableAdvanced',
        label: '启用高级函数',
        description: '支持三角函数、对数等高级数学函数',
        type: 'boolean' as const,
        defaultValue: true
      }
    ],
    values: {
      precision: 10,
      enableAdvanced: true
    }
  }

  async initialize(): Promise<void> {
    console.log('计算器插件初始化完成')
  }

  async search(context: SearchContext): Promise<SearchResultItem[]> {
    const { query } = context
    
    // 检查是否是数学表达式
    if (!this.isMathExpression(query)) {
      return []
    }

    try {
      const result = this.evaluateExpression(query)
      
      if (result === null) {
        return []
      }

      return [{
        id: `calc-${query}`,
        title: this.formatResult(result),
        description: `计算: ${query}`,
        icon: Calculator,
        priority: this.priority + 50, // 数学表达式优先级很高
        action: () => this.copyResult(result),
        source: this.id,
        metadata: {
          type: 'calculation',
          expression: query,
          result: result
        }
      }]
    } catch (error) {
      console.error('计算失败:', error)
      return []
    }
  }

  private isMathExpression(query: string): boolean {
    // 基本的数学表达式检测
    const mathPattern = /^[\d\s+\-*/().^√πe,]+$/
    
    // 包含数字和运算符
    const hasNumber = /\d/.test(query)
    const hasOperator = /[+\-*/^√]/.test(query)
    
    // 高级函数检测
    const advancedFunctions = /\b(sin|cos|tan|log|ln|sqrt|abs|floor|ceil|round)\s*\(/i
    
    return (mathPattern.test(query) && hasNumber && hasOperator) || 
           advancedFunctions.test(query)
  }

  private evaluateExpression(expression: string): number | null {
    try {
      // 清理表达式
      let cleanExpr = expression
        .replace(/\s+/g, '') // 移除空格
        .replace(/π/g, 'Math.PI') // 替换π
        .replace(/e/g, 'Math.E') // 替换e
        .replace(/√/g, 'Math.sqrt') // 替换√
        .replace(/\^/g, '**') // 替换^为**
      
      // 如果启用了高级函数，替换函数名
      if (this.settings.values.enableAdvanced) {
        cleanExpr = cleanExpr
          .replace(/\bsin\(/gi, 'Math.sin(')
          .replace(/\bcos\(/gi, 'Math.cos(')
          .replace(/\btan\(/gi, 'Math.tan(')
          .replace(/\blog\(/gi, 'Math.log10(')
          .replace(/\bln\(/gi, 'Math.log(')
          .replace(/\bsqrt\(/gi, 'Math.sqrt(')
          .replace(/\babs\(/gi, 'Math.abs(')
          .replace(/\bfloor\(/gi, 'Math.floor(')
          .replace(/\bceil\(/gi, 'Math.ceil(')
          .replace(/\bround\(/gi, 'Math.round(')
      }

      // 安全性检查：只允许特定的字符和函数
      const safePattern = /^[\d+\-*/.()\sMath]+$/
      if (!safePattern.test(cleanExpr)) {
        return null
      }

      // 使用Function构造函数安全地计算表达式
      const result = new Function(`return ${cleanExpr}`)() as number
      
      // 检查结果是否有效
      if (typeof result !== 'number' || !isFinite(result)) {
        return null
      }

      // 应用精度设置
      const precision = this.settings.values.precision
      return Number(result.toFixed(precision))
    } catch (error) {
      return null
    }
  }

  private formatResult(result: number): string {
    // 格式化大数字
    if (Math.abs(result) >= 1e6) {
      return result.toExponential(3)
    }
    
    // 移除末尾的零
    const formatted = result.toString()
    if (formatted.includes('.')) {
      return formatted.replace(/\\.?0+$/, '')
    }
    
    return formatted
  }

  private async copyResult(result: number): Promise<void> {
    try {
      const formatted = this.formatResult(result)
      await navigator.clipboard.writeText(formatted)
      console.log(`计算结果 ${formatted} 已复制到剪贴板`)
    } catch (error) {
      console.error('复制结果失败:', error)
    }
  }
}

/**
 * 单位转换插件
 */
export class UnitConverterPlugin implements SearchPlugin {
  id = 'units'
  name = '单位转换'
  description = '转换长度、重量、温度等单位'
  icon = Calculator
  version = '1.0.0'
  enabled = true
  priority = 85
  searchPrefixes = ['convert:', 'unit:']

  private conversions = {
    // 长度
    length: {
      m: 1, // 基准单位：米
      km: 1000,
      cm: 0.01,
      mm: 0.001,
      ft: 0.3048,
      inch: 0.0254,
      yard: 0.9144,
      mile: 1609.34
    },
    // 重量
    weight: {
      kg: 1, // 基准单位：千克
      g: 0.001,
      lb: 0.453592,
      oz: 0.0283495,
      ton: 1000
    },
    // 温度（特殊处理）
    temperature: {
      celsius: (c: number) => ({ celsius: c, fahrenheit: c * 9/5 + 32, kelvin: c + 273.15 }),
      fahrenheit: (f: number) => ({ celsius: (f - 32) * 5/9, fahrenheit: f, kelvin: (f - 32) * 5/9 + 273.15 }),
      kelvin: (k: number) => ({ celsius: k - 273.15, fahrenheit: (k - 273.15) * 9/5 + 32, kelvin: k })
    }
  }

  async initialize(): Promise<void> {
    console.log('单位转换插件初始化完成')
  }

  async search(context: SearchContext): Promise<SearchResultItem[]> {
    const { query } = context
    
    const conversion = this.parseConversion(query)
    if (!conversion) {
      return []
    }

    const results = this.convertUnit(conversion)
    
    return results.map((result, index) => ({
      id: `unit-${query}-${index}`,
      title: result.formatted,
      description: `${conversion.value} ${conversion.fromUnit} = ${result.formatted}`,
      icon: Calculator,
      priority: this.priority + (10 - index), // 第一个结果优先级最高
      action: () => this.copyResult(result.formatted),
      source: this.id,
      metadata: {
        type: 'unit_conversion',
        original: conversion,
        result: result
      }
    }))
  }

  private parseConversion(query: string): { value: number; fromUnit: string; toUnit?: string } | null {
    // 匹配格式："100 km to miles" 或 "100km" 或 "100 degrees celsius"
    const patterns = [
      /^([\d.]+)\s*(\w+)\s+(?:to|in)\s+(\w+)$/i,
      /^([\d.]+)\s*(\w+)$/i
    ]

    for (const pattern of patterns) {
      const match = query.match(pattern)
      if (match) {
        return {
          value: parseFloat(match[1]),
          fromUnit: match[2].toLowerCase(),
          toUnit: match[3]?.toLowerCase()
        }
      }
    }

    return null
  }

  private convertUnit(conversion: { value: number; fromUnit: string; toUnit?: string }): Array<{ value: number; unit: string; formatted: string }> {
    const results: Array<{ value: number; unit: string; formatted: string }> = []
    
    // 查找单位所属的转换类别
    for (const [category, units] of Object.entries(this.conversions)) {
      if (category === 'temperature') {
        const tempConversions = units as any
        if (conversion.fromUnit in tempConversions) {
          const converted = tempConversions[conversion.fromUnit](conversion.value)
          for (const [unit, value] of Object.entries(converted)) {
            if (unit !== conversion.fromUnit) {
              results.push({
                value: value as number,
                unit,
                formatted: `${(value as number).toFixed(2)} °${unit.charAt(0).toUpperCase()}`
              })
            }
          }
          break
        }
      } else {
        const unitMap = units as Record<string, number>
        if (conversion.fromUnit in unitMap) {
          const baseValue = conversion.value * unitMap[conversion.fromUnit]
          
          for (const [unit, factor] of Object.entries(unitMap)) {
            if (unit !== conversion.fromUnit) {
              const convertedValue = baseValue / factor
              results.push({
                value: convertedValue,
                unit,
                formatted: `${convertedValue.toFixed(3).replace(/\\.?0+$/, '')} ${unit}`
              })
            }
          }
          break
        }
      }
    }

    return results.slice(0, 5) // 限制结果数量
  }

  private async copyResult(result: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(result)
      console.log(`转换结果 ${result} 已复制到剪贴板`)
    } catch (error) {
      console.error('复制结果失败:', error)
    }
  }
}