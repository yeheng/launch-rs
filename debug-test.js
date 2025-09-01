// 临时调试脚本
const dangerousPatterns = [
  // 路径遍历 - 增强检测
  /\.\.[\/\\]/g,
  /(~\/|\/\.\.)|(\.\.\.\.)/gi,
  /(\/etc\/|\/usr\/|\/bin\/|\/sbin\/|\/var\/)/gi,
  /(c:\\\\\\\\|d:\\\\\\\\|e:\\\\\\\\|f:\\\\\\\\).*\\\\\\\\/gi,
  /(\/tmp\/|\/var\/tmp\/|\/dev\/)/gi,
  
  // 配置文件和敏感文件访问
  /(\.env|\.git|\.ssh|config\.xml|web\.config|\.htaccess)/gi,
  /(passwd|shadow|hosts|resolv\.conf)/gi
];

function testPathTraversal() {
  const testCases = [
    'C:\\Windows\\System32\\config',
    'C:\\\\Windows\\\\System32\\\\config',
    '../../../etc/passwd',
    'C:\\Windows\\System32\\config',
    '/etc/passwd'
  ];
  
  console.log('=== 路径遍历检测测试 ===');
  for (const testPath of testCases) {
    let isDangerous = false;
    let matchedPattern = null;
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(testPath)) {
        isDangerous = true;
        matchedPattern = pattern;
        break;
      }
    }
    
    console.log(`路径: ${testPath}`);
    console.log(`危险: ${isDangerous}`);
    console.log(`匹配模式: ${matchedPattern}`);
    console.log('---');
  }
}

// 测试插件ID验证
function testPluginIdValidation() {
  const pluginIdPattern = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
  const invalidIds = ['123plugin', 'my plugin', 'my@plugin', 'my'];
  
  console.log('=== 插件ID验证测试 ===');
  for (const id of invalidIds) {
    const isValid = pluginIdPattern.test(id);
    console.log(`ID: ${id}`);
    console.log(`有效: ${isValid}`);
    console.log('---');
  }
}

// 测试数学表达式验证
function testMathExpression() {
  const dangerousPatterns = [
    // 函数调用检测
    /[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/,
  ];
  
  const safeExpressions = [
    'Math.sin(0)',
    'Math.cos(0)', 
    'Math.PI',
    'sin(0)',
    '2 + 2'
  ];
  
  console.log('=== 数学表达式验证测试 ===');
  for (const expr of safeExpressions) {
    let isDangerous = false;
    let matchedPattern = null;
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(expr)) {
        isDangerous = true;
        matchedPattern = pattern;
        break;
      }
    }
    
    console.log(`表达式: ${expr}`);
    console.log(`危险: ${isDangerous}`);
    console.log(`匹配模式: ${matchedPattern}`);
    console.log('---');
  }
}

testPathTraversal();
console.log('\n');
testPluginIdValidation();
console.log('\n');
testMathExpression();