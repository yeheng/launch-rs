/**
 * 增强的输入验证和消毒模块 v2.1
 * 合并了 enhanced-input-validator.ts 和 enhanced-input-validator-v2.ts 的优点
 * 对搜索查询和用户输入进行安全验证和清理
 */

/**
 * 输入验证结果类型
 */
export interface ValidationResult {
  isValid: boolean
  sanitized: string
  errors: string[]
  warnings: string[]
}

/**
 * 增强的搜索查询验证和消毒
 * 基于 v2 版本，增强了类型安全性
 */
export function validateAndSanitizeSearchQuery(query: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    sanitized: '',
    errors: [],
    warnings: []
  }

  // 处理null或undefined输入
  if (query === null || query === undefined) {
    result.isValid = false
    result.errors.push('搜索查询不能为null或undefined')
    return result
  }

  // 处理非字符串输入
  if (typeof query !== 'string') {
    result.isValid = false
    result.errors.push('搜索查询必须是字符串类型')
    return result
  }

  // 基础检查
  if (!query || query.trim().length === 0) {
    result.isValid = false
    result.errors.push('搜索查询不能为空')
    return result
  }

  result.sanitized = query.trim()
  const trimmed = query.trim()

  // 长度检查
  if (trimmed.length < 1) {
    result.isValid = false
    result.errors.push('搜索查询过短')
    return result
  }

  if (trimmed.length > 500) {
    result.warnings.push('搜索查询过长，可能会影响性能')
    result.sanitized = trimmed.substring(0, 500)
  }

  // 增强的特殊字符检查 - 全面安全模式
  const dangerousPatterns = [
    // 脚本注入相关
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /data:\s*text\/html/gi,
    /on\w+\s*=/gi, // onclick= onerror= 等
    /<\s*\/?\s*script\s*>/gi,
    /<\s*iframe[^>]*>/gi,
    /<\s*object[^>]*>/gi,
    /<\s*embed[^>]*>/gi,
    /expression\s*\(/gi,
    /vbscript:/gi,
    /@import/i,
    /-\s*moz\-binding/i,
    
    // SQL注入相关 - 增强检测
    /(\b(select|insert|update|delete|drop|create|alter|exec|execute|truncate|union|having|where|group\s+by|order\s+by)\b)/gi,
    /('(|'')|(\b(or|and)\s+\d+\s*=\s*\d+)|(\b(or|and)\s+['"][^'"]*['"]\s*=\s*['"][^'"]*['"]))/gi,
    /(\*\s*from\s+\w+)|(\bwhere\s+\w+\s*=\s*['"])/gi,
    /(\bunion\s+select\b)|(\binto\s+(outfile|dumpfile)\b)/gi,
    /(\bload_file\s*\()|(\bbenchmark\s*\()|(\bsleep\s*\()/gi,
    
    // 命令注入相关 - 增强检测
    /[;&|`$(){}[\]<>'"]/g,
    /\b(system|exec|eval|shell_exec|passthru|proc_open|popen|pcntl_exec|curl_exec|wget)\b/gi,
    /(\bnc\s+)|(\bnetcat\s+)|(\btelnet\s+)|(\bssh\s+)|(\bscp\s+)/gi,
    /(\bping\s+)|(\bnslookup\s+)|(\bdig\s+)|(\bwhois\s+)/gi,
    /(\brm\s+-rf\s+)|(\bchmod\s+777\s+)|(\bchown\s+)/gi,
    /(\b>\s*\/dev\/null\s*2>&1\s*;)|(\b2>&1\s*\|)/gi,
    
    // 路径遍历 - 增强检测
    /\.\.[\/\\]/g,
    /(~\/|\/\.\.)|(\.\.\.\.)/gi,
    /(\/etc\/|\/usr\/|\/bin\/|\/sbin\/|\/var\/)/gi,
    /[a-zA-Z]:\\[a-zA-Z0-9_\\\$]+/gi,
    /(\/tmp\/|\/var\/tmp\/|\/dev\/)/gi,
    
    // 配置文件和敏感文件访问
    /(\.env|\.git|\.ssh|config\.xml|web\.config|\.htaccess)/gi,
    /(passwd|shadow|hosts|resolv\.conf)/gi,
    
    // 其他危险模式
    /base64_decode/gi,
    /chr\s*\(/gi,
    /ord\s*\(/gi,
    /pack\s*\(/gi,
    /eval\s*\(/gi,
    /assert\s*\(/gi,
    /preg_replace\s*\/.*\/e/gi
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      result.isValid = false
      result.errors.push(`搜索查询包含危险字符或模式: ${pattern}`)
      break
    }
  }

  // 特殊字符清理（移除但不过度限制）
  result.sanitized = result.sanitized
    .replace(/[\x00-\x1F\x7F]/g, '') // 移除控制字符
    .replace(/[\u2028\u2029]/g, '') // 移除行分隔符和段落分隔符
    .replace(/\s+/g, ' ') // 标准化空格

  // 检查清理后的结果
  if (result.sanitized.trim().length === 0) {
    result.isValid = false
    result.errors.push('清理后的搜索查询为空')
  }

  return result
}

/**
 * 增强的文件路径验证
 * 基于 v2 版本，增强了类型安全性
 */
export function validateFilePath(path: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    sanitized: '',
    errors: [],
    warnings: []
  }

  // 处理null或undefined输入
  if (path === null || path === undefined) {
    result.isValid = false
    result.errors.push('文件路径不能为null或undefined')
    return result
  }

  // 处理非字符串输入
  if (typeof path !== 'string') {
    result.isValid = false
    result.errors.push('文件路径必须是字符串类型')
    return result
  }

  if (!path || path.trim().length === 0) {
    result.isValid = false
    result.errors.push('文件路径不能为空')
    return result
  }

  result.sanitized = path.trim()
  const trimmed = path.trim()

  // 长度检查
  if (trimmed.length > 4096) {
    result.isValid = false
    result.errors.push('文件路径过长')
    return result
  }

  // 增强的危险字符检查
  const dangerousChars = /[<>:"|?*]/g
  if (dangerousChars.test(trimmed)) {
    result.warnings.push('文件路径包含非法字符，将被清理')
    result.sanitized = result.sanitized.replace(dangerousChars, '')
  }

  // 增强的路径遍历检查
  const pathTraversalPatterns = [
    /\.\.[\/\\]/g,
    /(~\/|\/\.\.)|(\.\.\.\.)/gi,
    /(\/etc\/|\/usr\/|\/bin\/|\/sbin\/|\/var\/)/gi,
    /[a-zA-Z]:\\[a-zA-Z0-9_\\\$]+/gi,
    /(\/tmp\/|\/var\/tmp\/|\/dev\/)/gi,
    /(\.env|\.git|\.ssh)/gi,
    /(passwd|shadow|hosts|resolv\.conf)/gi
  ]

  for (const pattern of pathTraversalPatterns) {
    if (pattern.test(trimmed)) {
      result.warnings.push('文件路径包含路径遍历尝试，将被清理')
      result.sanitized = result.sanitized.replace(pattern, '')
    }
  }

  // 网络路径检查
  const networkPath = /^\\\\\w+/i
  if (networkPath.test(trimmed)) {
    result.warnings.push('网络路径可能不被支持')
  }

  return result
}

/**
 * 增强的插件ID验证
 * 基于 v2 版本，更严格的验证规则
 */
export function validatePluginId(pluginId: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    sanitized: '',
    errors: [],
    warnings: []
  }

  // 处理null或undefined输入
  if (pluginId === null || pluginId === undefined) {
    result.isValid = false
    result.errors.push('插件ID不能为null或undefined')
    return result
  }

  // 处理非字符串输入
  if (typeof pluginId !== 'string') {
    result.isValid = false
    result.errors.push('插件ID必须是字符串类型')
    return result
  }

  if (!pluginId || pluginId.trim().length === 0) {
    result.isValid = false
    result.errors.push('插件ID不能为空')
    return result
  }

  result.sanitized = pluginId.trim()
  const trimmed = pluginId.trim()

  // 插件ID格式检查（字母开头，包含字母、数字、下划线、连字符）
  const pluginIdPattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/
  if (!pluginIdPattern.test(trimmed)) {
    result.isValid = false
    result.errors.push('插件ID格式不正确，必须以字母开头，只包含字母、数字、下划线和连字符')
    return result
  }

  // 长度检查 - 使用 v2 的更严格标准
  if (trimmed.length < 3 || trimmed.length > 50) {
    result.isValid = false
    result.errors.push('插件ID长度必须在3-50个字符之间')
    return result
  }

  // 保留字检查 - 使用 v2 的严格处理
  const reservedWords = ['system', 'admin', 'root', 'core', 'builtin', 'api', 'auth', 'config', 'test']
  if (reservedWords.includes(trimmed.toLowerCase())) {
    result.isValid = false
    result.errors.push('插件ID使用了保留字，请选择其他名称')
    result.warnings.push('插件ID使用了保留字，可能会引起冲突')
    return result
  }

  return result
}

/**
 * 增强的数学表达式验证
 * 基于 v2 版本，智能函数白名单检查
 */
export function validateMathExpression(expression: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    sanitized: expression.trim(),
    errors: [],
    warnings: []
  }

  // 处理null或undefined输入
  if (expression === null || expression === undefined) {
    result.isValid = false
    result.errors.push('数学表达式不能为null或undefined')
    return result
  }

  // 处理非字符串输入
  if (typeof expression !== 'string') {
    result.isValid = false
    result.errors.push('数学表达式必须是字符串类型')
    return result
  }

  if (!expression || expression.trim().length === 0) {
    result.isValid = false
    result.errors.push('数学表达式不能为空')
    return result
  }

  const trimmed = expression.trim()

  // 长度检查
  if (trimmed.length > 200) {
    result.warnings.push('数学表达式过长，可能会影响性能')
    result.sanitized = trimmed.substring(0, 200)
  }

  // 检查是否包含数学运算符或数字
  const hasMathContent = /[\d+\-*/().^√πe]|(sin|cos|tan|log|ln|sqrt|abs|floor|ceil|round|Math\.)/i
  if (!hasMathContent.test(trimmed)) {
    result.warnings.push('表达式似乎不包含数学内容')
  }

  // 增强的危险模式检查
  const dangerousPatterns = [
    // 代码块
    /[{}[\]]/,
    // 赋值和逻辑运算符
    /[=;&|]/,
    // 危险函数
    /eval\s*\(/gi,
    /Function\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /document\./gi,
    /window\./gi,
    /global\./gi,
    /process\./gi,
    /require\s*\(/gi,
    /import\s+/gi
  ]

  // 函数调用白名单检查
  const functionCallPattern = /[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/g
  const safeMathFunctions = /^(Math\.)?(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|log|log10|log2|ln|sqrt|abs|floor|ceil|round|exp|pow|min|max|random|PI|E|SQRT2|SQRT1_2|LN2|LN10|LOG2E|LOG10E)\s*\(/
  const safeFunctions = /^(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|log|log10|log2|ln|sqrt|abs|floor|ceil|round|exp|pow|min|max)\s\(/

  // 检查函数调用
  const functionCalls = trimmed.match(functionCallPattern) || []
  for (const call of functionCalls) {
    const cleanCall = call.trim()
    if (!safeMathFunctions.test(cleanCall) && !safeFunctions.test(cleanCall)) {
      result.isValid = false
      result.errors.push(`数学表达式包含危险模式: ${cleanCall}`)
      break
    }
  }

  // 检查其他危险模式
  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      result.isValid = false
      result.errors.push(`数学表达式包含危险模式: ${pattern}`)
      break
    }
  }

  // 清理表达式
  result.sanitized = result.sanitized
    .replace(/\s+/g, '') // 移除空格
    .replace(/[\x00-\x1F\x7F]/g, '') // 移除控制字符

  return result
}

/**
 * 增强的通用输入消毒函数
 * 基于 v2 版本，增强了类型安全性
 */
export function sanitizeInput(input: string, options: {
  maxLength?: number
  allowHtml?: boolean
  allowScripts?: boolean
  trim?: boolean
  allowControlChars?: boolean
} = {}): string {
  // 处理null或undefined输入
  if (input === null || input === undefined) {
    return ''
  }

  // 处理非字符串输入
  if (typeof input !== 'string') {
    return ''
  }

  let sanitized = input

  // 基础清理
  if (options.trim !== false) {
    sanitized = sanitized.trim()
  }

  // 长度限制
  if (options.maxLength && sanitized.length > options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength)
  }

  // HTML清理
  if (!options.allowHtml) {
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  // 脚本清理 - 如果允许HTML，默认也允许脚本，除非明确禁止
  if (!options.allowScripts && !options.allowHtml) {
    sanitized = sanitized
      .replace(/javascript:/gi, 'javascript-disabled:')
      .replace(/on\w+\s*=/gi, 'on-disabled=')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<\s*\/?\s*script\s*>/gi, '')
      .replace(/data:\s*text\/html/gi, 'data-disabled:')
  }

  // 控制字符清理
  if (!options.allowControlChars) {
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  }

  return sanitized
}

/**
 * 增强的URL验证
 * 基于 v2 版本，更严格的协议控制
 */
export function validateUrl(url: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    sanitized: '',
    errors: [],
    warnings: []
  }

  // 处理null或undefined输入
  if (url === null || url === undefined) {
    result.isValid = false
    result.errors.push('URL不能为null或undefined')
    return result
  }

  // 处理非字符串输入
  if (typeof url !== 'string') {
    result.isValid = false
    result.errors.push('URL必须是字符串类型')
    return result
  }

  if (!url || url.trim().length === 0) {
    result.isValid = false
    result.errors.push('URL不能为空')
    return result
  }

  result.sanitized = url.trim()
  const trimmed = url.trim()

  try {
    // 尝试构造URL对象
    new URL(trimmed)
  } catch {
    // 如果失败，尝试添加协议
    try {
      new URL(`https://${trimmed}`)
      result.warnings.push('URL缺少协议，已自动补充')
      result.sanitized = `https://${trimmed}`
    } catch {
      result.isValid = false
      result.errors.push('URL格式不正确')
      return result
    }
  }

  // 增强的协议检查 - 使用 v2 的严格标准
  const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:']
  const blockedProtocols = ['javascript:', 'vbscript:', 'data:', 'ftp:', 'ftps:', 'file:', 'about:', 'chrome:', 'moz-extension:']
  
  const urlObj = new URL(result.sanitized)
  
  if (!allowedProtocols.includes(urlObj.protocol)) {
    if (blockedProtocols.includes(urlObj.protocol)) {
      result.isValid = false
      result.errors.push(`不支持的协议: ${urlObj.protocol}`)
      return result
    } else {
      result.warnings.push(`未知协议: ${urlObj.protocol}`)
    }
  }

  // 检查data协议的内容类型
  if (urlObj.protocol === 'data:') {
    const dataContent = urlObj.pathname
    if (dataContent.includes('text/html') || dataContent.includes('text/javascript')) {
      result.isValid = false
      result.errors.push('data协议不支持HTML或JavaScript内容')
      return result
    }
  }

  // 长度检查
  if (result.sanitized.length > 2048) {
    result.warnings.push('URL过长，可能会影响性能')
  }

  return result
}

/**
 * 增强的输入验证器类
 * 提供统一的静态方法接口
 */
export class InputValidator {
  /**
   * 验证搜索查询
   */
  static validateSearchQuery(query: string): ValidationResult {
    return validateAndSanitizeSearchQuery(query)
  }

  /**
   * 验证文件路径
   */
  static validateFilePath(path: string): ValidationResult {
    return validateFilePath(path)
  }

  /**
   * 验证插件ID
   */
  static validatePluginId(pluginId: string): ValidationResult {
    return validatePluginId(pluginId)
  }

  /**
   * 验证数学表达式
   */
  static validateMathExpression(expression: string): ValidationResult {
    return validateMathExpression(expression)
  }

  /**
   * 验证URL
   */
  static validateUrl(url: string): ValidationResult {
    return validateUrl(url)
  }

  /**
   * 通用消毒
   */
  static sanitize(input: string, options?: Parameters<typeof sanitizeInput>[1]): string {
    return sanitizeInput(input, options)
  }
}