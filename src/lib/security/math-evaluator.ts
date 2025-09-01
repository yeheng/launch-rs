/**
 * 安全数学表达式求值器
 * 替代不安全的 new Function() 调用
 */

/**
 * 安全的数学表达式求值函数
 * 只支持基本的数学运算和预定义的函数
 */
export function evaluateMathExpression(expression: string): number | null {
  try {
    // 清理表达式
    const cleanExpr = sanitizeExpression(expression)
    if (!cleanExpr) {
      return null
    }

    // 使用栈式求值算法
    return evaluateWithStack(cleanExpr)
  } catch (error) {
    return null
  }
}

/**
 * 表达式清理和验证
 */
function sanitizeExpression(expression: string): string | null {
  // 移除所有空格
  let cleanExpr = expression.replace(/\s+/g, '')
  
  // 验证字符安全性 - 允许数学函数和运算符
  // 更宽松的正则表达式，允许负号出现在数字前面
  const allowedChars = /^[\d+\-*/().^√πe,sqrtinlcotafebrgdu]+$/
  if (!allowedChars.test(cleanExpr)) {
    return null
  }
  
  // 替换常量
  cleanExpr = cleanExpr
    .replace(/π/g, Math.PI.toString())
    // 只替换独立的 e，不是函数名的一部分
    .replace(/\be\b/g, Math.E.toString())
  
  // 处理 sqrt 函数调用
  // 将 sqrt(16) 和 sqrt16 格式统一处理
  cleanExpr = cleanExpr.replace(/sqrt(\d+)/g, 'sqrt($1)') // sqrt16 -> sqrt(16)
  cleanExpr = cleanExpr.replace(/√(\d+)/g, 'sqrt($1)')     // √16 -> sqrt(16)
  cleanExpr = cleanExpr.replace(/√/g, 'sqrt')           // √(16) -> sqrt(16)
  
  return cleanExpr
}

/**
 * 使用栈式算法计算表达式
 */
function evaluateWithStack(expression: string): number | null {
  try {
    // 将表达式转换为中缀表达式数组
    const tokens = tokenizeExpression(expression)
    if (!tokens) {
      return null
    }

    // 转换为后缀表达式（逆波兰表示法）
    const postfix = infixToPostfix(tokens)
    if (!postfix) {
      return null
    }

    // 计算后缀表达式
    return evaluatePostfix(postfix)
  } catch (error) {
    return null
  }
}

/**
 * 将表达式转换为标记数组
 */
function tokenizeExpression(expression: string): string[] | null {
  const tokens: string[] = []
  let i = 0
  
  while (i < expression.length) {
    const char = expression[i]
    
    if (char >= '0' && char <= '9' || char === '.') {
      // 解析数字
      let num = ''
      while (i < expression.length && 
             (expression[i] >= '0' && expression[i] <= '9' || expression[i] === '.')) {
        num += expression[i]
        i++
      }
      tokens.push(num)
    } else if (char === 's' && expression.startsWith('sqrt', i)) {
      // 解析sqrt函数
      tokens.push('sqrt')
      i += 4
      // 跳过可能的空格
      while (i < expression.length && expression[i] === ' ') {
        i++
      }
      // 检查是否有左括号
      if (i < expression.length && expression[i] === '(') {
        tokens.push('(')
        i++
      }
    } else if (char === 's' && expression.startsWith('sin', i)) {
      // 解析sin函数
      tokens.push('sin')
      i += 3
      // 跳过可能的空格
      while (i < expression.length && expression[i] === ' ') {
        i++
      }
      // 检查是否有左括号
      if (i < expression.length && expression[i] === '(') {
        tokens.push('(')
        i++
      }
    } else if (char === 'c' && expression.startsWith('cos', i)) {
      // 解析cos函数
      tokens.push('cos')
      i += 3
      // 跳过可能的空格
      while (i < expression.length && expression[i] === ' ') {
        i++
      }
      // 检查是否有左括号
      if (i < expression.length && expression[i] === '(') {
        tokens.push('(')
        i++
      }
    } else if (char === 't' && expression.startsWith('tan', i)) {
      // 解析tan函数
      tokens.push('tan')
      i += 3
      // 跳过可能的空格
      while (i < expression.length && expression[i] === ' ') {
        i++
      }
      // 检查是否有左括号
      if (i < expression.length && expression[i] === '(') {
        tokens.push('(')
        i++
      }
    } else if (char === 'l' && expression.startsWith('log', i)) {
      // 解析log函数
      tokens.push('log')
      i += 3
      // 跳过可能的空格
      while (i < expression.length && expression[i] === ' ') {
        i++
      }
      // 检查是否有左括号
      if (i < expression.length && expression[i] === '(') {
        tokens.push('(')
        i++
      }
    } else if (char === 'l' && expression.startsWith('ln', i)) {
      // 解析ln函数
      tokens.push('ln')
      i += 2
      // 跳过可能的空格
      while (i < expression.length && expression[i] === ' ') {
        i++
      }
      // 检查是否有左括号
      if (i < expression.length && expression[i] === '(') {
        tokens.push('(')
        i++
      }
    } else if (char === 'a' && expression.startsWith('abs', i)) {
      // 解析abs函数
      tokens.push('abs')
      i += 3
      // 跳过可能的空格
      while (i < expression.length && expression[i] === ' ') {
        i++
      }
      // 检查是否有左括号
      if (i < expression.length && expression[i] === '(') {
        tokens.push('(')
        i++
      }
    } else if (char === 'f' && expression.startsWith('floor', i)) {
      // 解析floor函数
      tokens.push('floor')
      i += 5
      // 跳过可能的空格
      while (i < expression.length && expression[i] === ' ') {
        i++
      }
      // 检查是否有左括号
      if (i < expression.length && expression[i] === '(') {
        tokens.push('(')
        i++
      }
    } else if (char === 'c' && expression.startsWith('ceil', i)) {
      // 解析ceil函数
      tokens.push('ceil')
      i += 4
      // 跳过可能的空格
      while (i < expression.length && expression[i] === ' ') {
        i++
      }
      // 检查是否有左括号
      if (i < expression.length && expression[i] === '(') {
        tokens.push('(')
        i++
      }
    } else if (char === 'r' && expression.startsWith('round', i)) {
      // 解析round函数
      tokens.push('round')
      i += 5
      // 跳过可能的空格
      while (i < expression.length && expression[i] === ' ') {
        i++
      }
      // 检查是否有左括号
      if (i < expression.length && expression[i] === '(') {
        tokens.push('(')
        i++
      }
    } else if (char === ')') {
      // 右括号
      tokens.push(char)
      i++
    } else if ('+-*/(^'.includes(char)) {
      // 处理一元负号（在函数调用后或左括号后的负号）
      if (char === '-' && (tokens.length === 0 || tokens[tokens.length - 1] === '(' || ['sin', 'cos', 'tan', 'log', 'ln', 'abs', 'floor', 'ceil', 'round', 'sqrt'].includes(tokens[tokens.length - 1]))) {
        // 一元负号，用特殊标记
        tokens.push('neg')
      } else {
        // 普通运算符
        tokens.push(char)
      }
      i++
    } else if (char === ' ') {
      // 跳过空格
      i++
    } else {
      // 不支持的字符
      return null
    }
  }
  
  return tokens
}

/**
 * 运算符优先级
 */
function getOperatorPrecedence(operator: string): number {
  switch (operator) {
    case '^': return 8
    case 'sqrt': return 8
    case 'sin': case 'cos': case 'tan': return 7
    case 'log': case 'ln': return 7
    case 'abs': return 7
    case 'floor': case 'ceil': case 'round': return 7
    case 'neg': return 9 // 一元负号具有最高优先级
    case '*': case '/': return 6
    case '+': case '-': return 5
    default: return 0
  }
}

/**
 * 中缀表达式转后缀表达式
 */
function infixToPostfix(tokens: string[]): string[] | null {
  const output: string[] = []
  const operators: string[] = []
  
  // 数学函数集合
  const mathFunctions = ['sqrt', 'sin', 'cos', 'tan', 'log', 'ln', 'abs', 'floor', 'ceil', 'round']
  
  for (const token of tokens) {
    if (!isNaN(parseFloat(token))) {
      // 数字直接输出
      output.push(token)
    } else if (mathFunctions.includes(token)) {
      // 数学函数
      operators.push(token)
    } else if (token === 'neg') {
      // 一元负号压栈，像其他运算符一样
      operators.push(token)
    } else if (token === '(') {
      // 左括号压栈
      operators.push(token)
    } else if (token === ')') {
      // 右括号，弹出运算符直到遇到左括号
      while (operators.length > 0 && operators[operators.length - 1] !== '(') {
        output.push(operators.pop()!)
      }
      if (operators.length === 0) {
        return null // 括号不匹配
      }
      operators.pop() // 弹出左括号
      
      // 如果栈顶是数学函数，也弹出
      if (operators.length > 0 && mathFunctions.includes(operators[operators.length - 1])) {
        output.push(operators.pop()!)
      }
    } else {
      // 运算符
      while (operators.length > 0 && 
             operators[operators.length - 1] !== '(' &&
             getOperatorPrecedence(operators[operators.length - 1]) >= getOperatorPrecedence(token)) {
        output.push(operators.pop()!)
      }
      operators.push(token)
    }
  }
  
  // 弹出剩余的运算符
  while (operators.length > 0) {
    if (operators[operators.length - 1] === '(') {
      return null // 括号不匹配
    }
    output.push(operators.pop()!)
  }
  
  return output
}

/**
 * 计算后缀表达式
 */
function evaluatePostfix(postfix: string[]): number | null {
  const stack: number[] = []
  
  for (const token of postfix) {
    if (!isNaN(parseFloat(token))) {
      // 数字压栈
      stack.push(parseFloat(token))
    } else if (token === 'sqrt') {
      // sqrt函数
      if (stack.length < 1) return null
      const operand = stack.pop()!
      if (operand < 0) return null // 负数不能开平方
      stack.push(Math.sqrt(operand))
    } else if (token === 'sin') {
      // sin函数
      if (stack.length < 1) return null
      const operand = stack.pop()!
      stack.push(Math.sin(operand))
    } else if (token === 'cos') {
      // cos函数
      if (stack.length < 1) return null
      const operand = stack.pop()!
      stack.push(Math.cos(operand))
    } else if (token === 'tan') {
      // tan函数
      if (stack.length < 1) return null
      const operand = stack.pop()!
      stack.push(Math.tan(operand))
    } else if (token === 'log') {
      // log函数 (以10为底)
      if (stack.length < 1) return null
      const operand = stack.pop()!
      if (operand <= 0) return null // 对数函数的定义域大于0
      stack.push(Math.log10(operand))
    } else if (token === 'ln') {
      // ln函数 (自然对数)
      if (stack.length < 1) return null
      const operand = stack.pop()!
      if (operand <= 0) return null // 对数函数的定义域大于0
      stack.push(Math.log(operand))
    } else if (token === 'abs') {
      // abs函数
      if (stack.length < 1) return null
      const operand = stack.pop()!
      stack.push(Math.abs(operand))
    } else if (token === 'floor') {
      // floor函数
      if (stack.length < 1) return null
      const operand = stack.pop()!
      stack.push(Math.floor(operand))
    } else if (token === 'ceil') {
      // ceil函数
      if (stack.length < 1) return null
      const operand = stack.pop()!
      stack.push(Math.ceil(operand))
    } else if (token === 'round') {
      // round函数
      if (stack.length < 1) return null
      const operand = stack.pop()!
      stack.push(Math.round(operand))
    } else if (token === 'neg') {
      // 一元负号
      if (stack.length < 1) return null
      const operand = stack.pop()!
      stack.push(-operand)
    } else {
      // 二元运算符
      if (stack.length < 2) return null
      const b = stack.pop()!
      const a = stack.pop()!
      
      let result: number
      switch (token) {
        case '+':
          result = a + b
          break
        case '-':
          result = a - b
          break
        case '*':
          result = a * b
          break
        case '/':
          if (b === 0) return null // 除零错误
          result = a / b
          break
        case '^':
          result = Math.pow(a, b)
          break
        default:
          return null // 不支持的运算符
      }
      
      stack.push(result)
    }
  }
  
  if (stack.length !== 1) {
    return null // 表达式错误
  }
  
  return stack[0]
}

/**
 * 扩展的数学表达式求值器（支持更多函数）
 */
export function evaluateAdvancedMathExpression(expression: string, precision: number = 10): number | null {
  try {
    // 首先尝试基础求值
    const basicResult = evaluateMathExpression(expression)
    if (basicResult !== null) {
      return Number(basicResult.toFixed(precision))
    }
    
    // 如果基础求值失败，尝试支持更多函数
    return evaluateWithAdvancedFunctions(expression, precision)
  } catch (error) {
    return null
  }
}

/**
 * 支持高级函数的表达式求值
 */
function evaluateWithAdvancedFunctions(expression: string, precision: number): number | null {
  // 支持的函数映射
  const functionMap: Record<string, (x: number) => number> = {
    'sin': Math.sin,
    'cos': Math.cos,
    'tan': Math.tan,
    'log': Math.log10,
    'ln': Math.log,
    'abs': Math.abs,
    'floor': Math.floor,
    'ceil': Math.ceil,
    'round': Math.round
  }
  
  try {
    // 检查是否包含高级函数
    const functionPattern = /\b(sin|cos|tan|log|ln|abs|floor|ceil|round)\s*\(/i
    if (!functionPattern.test(expression)) {
      return null
    }
    
    // 替换函数调用
    let processedExpr = expression
    
    // 为每个函数创建安全的替换
    for (const [funcName, func] of Object.entries(functionMap)) {
      const regex = new RegExp(`\\b${funcName}\\s*\\(([^)]+)\\)`, 'gi')
      processedExpr = processedExpr.replace(regex, (match, arg) => {
        const argResult = evaluateMathExpression(arg.trim())
        if (argResult === null) return match
        return func(argResult).toString()
      })
    }
    
    // 计算最终结果
    const finalResult = evaluateMathExpression(processedExpr)
    if (finalResult === null) return null
    
    return Number(finalResult.toFixed(precision))
  } catch (error) {
    return null
  }
}