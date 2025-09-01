// 测试修复后的验证器

// 读取并执行 TypeScript 文件（简化版本）
function testValidator() {
  // 模拟路径遍历检测
  const pathPatterns = [
    /\.\.[\/\\]/g,
    /(~\/|\/\.\.)|(\.\.\.\.)/gi,
    /(\/etc\/|\/usr\/|\/bin\/|\/sbin\/|\/var\/)/gi,
    /[a-zA-Z]:\\[a-zA-Z0-9_\\\$]+/gi,
    /(\/tmp\/|\/var\/tmp\/|\/dev\/)/gi,
    /(\.env|\.git|\.ssh|config\.xml|web\.config|\.htaccess)/gi,
    /(passwd|shadow|hosts|resolv\.conf)/gi
  ];
  
  // 测试Windows路径
  const testPaths = [
    'C:\\Windows\\System32\\config',
    'C:/Windows/System32/config',
    'D:\\Program Files\\app',
    '../../../etc/passwd'
  ];
  
  console.log('=== 路径遍历检测测试 ===');
  for (const path of testPaths) {
    let isDangerous = false;
    for (const pattern of pathPatterns) {
      if (pattern.test(path)) {
        isDangerous = true;
        break;
      }
    }
    console.log(`路径: ${path} -> 危险: ${isDangerous}`);
  }
  
  // 测试数学表达式
  const mathFunctionPattern = /[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/g;
  const safeMathFunctions = /^(Math\.)?(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|log|log10|log2|ln|sqrt|abs|floor|ceil|round|exp|pow|min|max|random|PI|E|SQRT2|SQRT1_2|LN2|LN10|LOG2E|LOG10E)\s*\(/;
  const safeFunctions = /^(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|log|log10|log2|ln|sqrt|abs|floor|ceil|round|exp|pow|min|max)\s\(/;
  
  const mathExpressions = [
    'Math.sin(0)',
    'Math.cos(0)',
    'sin(0)',
    'eval("dangerous")',
    '2 + 2'
  ];
  
  console.log('\n=== 数学表达式测试 ===');
  for (const expr of mathExpressions) {
    const functionCalls = expr.match(mathFunctionPattern) || [];
    let hasUnsafeCall = false;
    
    for (const call of functionCalls) {
      const cleanCall = call.trim();
      if (!safeMathFunctions.test(cleanCall) && !safeFunctions.test(cleanCall)) {
        hasUnsafeCall = true;
        break;
      }
    }
    
    console.log(`表达式: ${expr} -> 安全: ${!hasUnsafeCall}`);
  }
  
  // 测试插件ID
  const pluginIdPattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
  const reservedWords = ['system', 'admin', 'root', 'core', 'builtin', 'api', 'auth', 'config', 'test'];
  
  const pluginIds = [
    'my-plugin',
    '123plugin',
    'my plugin',
    'system',
    'admin',
    'my'
  ];
  
  console.log('\n=== 插件ID测试 ===');
  for (const id of pluginIds) {
    const validFormat = pluginIdPattern.test(id);
    const validLength = id.length >= 2 && id.length <= 50;
    const notReserved = !reservedWords.includes(id.toLowerCase());
    const isValid = validFormat && validLength && notReserved;
    
    console.log(`ID: ${id} -> 格式: ${validFormat}, 长度: ${validLength}, 非保留: ${notReserved}, 有效: ${isValid}`);
  }
}

testValidator();