// store/index.ts
// Pinia 状态管理入口文件
// 用于导出所有状态模块，方便统一管理

// 导出统一状态管理器
export * from '../lib/state/unified-state-manager';

// 保持向后兼容性，导出用户存储适配器
export * from './modules/user';
