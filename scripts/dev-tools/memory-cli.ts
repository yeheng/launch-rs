#!/usr/bin/env node

/**
 * 内存管理CLI工具
 * 
 * 提供命令行接口来监控和分析应用程序内存使用情况
 */

import { Command } from 'commander';
import { globalMemoryIntegration, createMemoryIntegration } from '../src/lib/utils/memory-integration';
import { createMemoryMonitor } from '../src/lib/utils/memory-monitor';
import { logger } from '../src/lib/logger';

const program = new Command();

program
  .name('memory-cli')
  .description('内存管理CLI工具')
  .version('1.0.0');

// 健康检查命令
program
  .command('health')
  .description('检查内存健康状态')
  .option('-v, --verbose', '显示详细信息')
  .action(async (options) => {
    try {
      const health = globalMemoryIntegration.getHealth();
      
      if (options.verbose) {
        console.log(globalMemoryIntegration.getDetailedReport());
      } else {
        console.log(globalMemoryIntegration.getHealthReport());
      }
      
      // 根据健康状态设置退出码
      process.exit(health.status === 'critical' ? 1 : 0);
    } catch (error) {
      console.error('健康检查失败:', error);
      process.exit(1);
    }
  });

// 监控命令
program
  .command('monitor')
  .description('开始实时内存监控')
  .option('-i, --interval <seconds>', '监控间隔（秒）', '5')
  .option('-t, --timeout <seconds>', '监控超时时间（秒）', '0')
  .option('-a, --action <action>', '阈值触发的动作', 'log')
  .action(async (options) => {
    try {
      const interval = parseInt(options.interval) * 1000;
      const timeout = parseInt(options.timeout) * 1000;
      
      console.log(`开始内存监控，间隔: ${options.interval}秒`);
      
      const monitor = createMemoryMonitor({
        interval,
        thresholds: {
          heapUsed: {
            warning: 100 * 1024 * 1024,
            critical: 200 * 1024 * 1024,
            action: options.action
          },
          rss: {
            warning: 300 * 1024 * 1024,
            critical: 500 * 1024 * 1024,
            action: options.action
          },
          growthRate: {
            warning: 10,
            critical: 20,
            action: options.action
          }
        }
      });

      // 设置事件监听
      monitor.on('threshold', (data) => {
        console.log(`[${new Date().toISOString()}] 阈值告警: ${data.type} = ${formatBytes(data.value)} (${data.level})`);
      });

      monitor.on('leak', (leak) => {
        console.log(`[${new Date().toISOString()}] 内存泄漏: ${leak.type} - ${leak.location}`);
      });

      monitor.start();

      // 设置超时
      if (timeout > 0) {
        setTimeout(() => {
          monitor.stop();
          console.log('监控已停止');
          process.exit(0);
        }, timeout);
      }

      // 优雅关闭
      process.on('SIGINT', () => {
        monitor.stop();
        console.log('监控已停止');
        process.exit(0);
      });

    } catch (error) {
      console.error('监控启动失败:', error);
      process.exit(1);
    }
  });

// 分析命令
program
  .command('analyze')
  .description('执行深度内存分析')
  .option('-d, --deep', '启用深度检测')
  .option('-o, --output <file>', '输出报告到文件')
  .option('-f, --format <format>', '报告格式', 'json')
  .action(async (options) => {
    try {
      console.log('正在执行内存分析...');
      
      const results = await globalMemoryIntegration.triggerAnalysis();
      
      if (options.output) {
        const fs = require('fs');
        const path = require('path');
        
        const outputPath = path.resolve(options.output);
        const report = options.format === 'json' ? 
          JSON.stringify(results, null, 2) : 
          generateTextReport(results);
        
        fs.writeFileSync(outputPath, report);
        console.log(`报告已保存到: ${outputPath}`);
      } else {
        console.log(JSON.stringify(results, null, 2));
      }
      
    } catch (error) {
      console.error('内存分析失败:', error);
      process.exit(1);
    }
  });

// 清理命令
program
  .command('cleanup')
  .description('执行内存清理操作')
  .option('-f, --force', '强制清理')
  .action(async (options) => {
    try {
      if (!options.force) {
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const answer = await new Promise<string>(resolve => {
          rl.question('确定要执行内存清理吗? (y/N): ', resolve);
        });

        rl.close();

        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('清理操作已取消');
          return;
        }
      }

      console.log('正在执行内存清理...');
      globalMemoryIntegration.performMemoryCleanup();
      console.log('内存清理完成');
      
    } catch (error) {
      console.error('内存清理失败:', error);
      process.exit(1);
    }
  });

// 报告命令
program
  .command('report')
  .description('生成内存使用报告')
  .option('-o, --output <file>', '输出报告到文件')
  .option('-f, --format <format>', '报告格式', 'text')
  .action(async (options) => {
    try {
      const report = options.format === 'json' ? 
        JSON.stringify(globalMemoryIntegration.getStats(), null, 2) :
        globalMemoryIntegration.getDetailedReport();
      
      if (options.output) {
        const fs = require('fs');
        const path = require('path');
        
        const outputPath = path.resolve(options.output);
        fs.writeFileSync(outputPath, report);
        console.log(`报告已保存到: ${outputPath}`);
      } else {
        console.log(report);
      }
      
    } catch (error) {
      console.error('报告生成失败:', error);
      process.exit(1);
    }
  });

// 比较命令
program
  .command('compare')
  .description('比较两次内存快照')
  .argument('<before>', '之前的快照文件')
  .argument('<after>', '之后的快照文件')
  .action(async (before, after) => {
    try {
      const fs = require('fs');
      
      const beforeData = JSON.parse(fs.readFileSync(before, 'utf8'));
      const afterData = JSON.parse(fs.readFileSync(after, 'utf8'));
      
      const comparison = compareSnapshots(beforeData, afterData);
      
      console.log('内存使用比较:');
      console.log(JSON.stringify(comparison, null, 2));
      
    } catch (error) {
      console.error('快照比较失败:', error);
      process.exit(1);
    }
  });

// 辅助函数
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

function generateTextReport(results: any): string {
  let report = '🧠 内存分析报告\n\n';
  
  if (results.health) {
    report += '健康状态:\n';
    report += `  状态: ${results.health.status}\n`;
    report += `  内存使用: ${formatBytes(results.health.memoryUsage)}\n`;
    report += `  泄漏数量: ${results.health.leakCount}\n`;
    report += `  组件数量: ${results.health.componentCount}\n\n`;
  }
  
  if (results.monitor) {
    report += '监控统计:\n';
    report += `  快照数量: ${results.monitor.snapshots.length}\n`;
    report += `  检测到的泄漏: ${results.monitor.leaks.length}\n`;
    report += `  监控时间: ${formatDuration(results.monitor.uptime)}\n\n`;
  }
  
  if (results.vue) {
    report += 'Vue 统计:\n';
    report += `  活跃组件: ${results.vue.activeComponents}\n`;
    report += `  总组件数: ${results.vue.totalComponents}\n`;
    report += `  总内存: ${formatBytes(results.vue.totalMemory)}\n`;
    report += `  平均内存: ${formatBytes(results.vue.averageComponentMemory)}\n`;
  }
  
  return report;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function compareSnapshots(before: any, after: any): any {
  const comparison: any = {
    timestamp: {
      before: before.timestamp,
      after: after.timestamp,
      difference: after.timestamp - before.timestamp
    },
    memory: {
      heapUsed: {
        before: before.heapUsed,
        after: after.heapUsed,
        difference: after.heapUsed - before.heapUsed,
        percentage: ((after.heapUsed - before.heapUsed) / before.heapUsed * 100).toFixed(2) + '%'
      },
      rss: {
        before: before.rss,
        after: after.rss,
        difference: after.rss - before.rss,
        percentage: ((after.rss - before.rss) / before.rss * 100).toFixed(2) + '%'
      }
    }
  };
  
  return comparison;
}

// 导出函数供其他模块使用
export {
  formatBytes,
  generateTextReport,
  compareSnapshots
};

// 如果直接运行此文件，执行CLI
if (require.main === module) {
  program.parse();
}