// 无头窗口模式前端控制示例
// 此文件展示如何在前端代码中控制Tauri窗口的无头模式

import { getCurrentWindow } from '@tauri-apps/api/window';
import { logger } from './logger';
import { handlePluginError } from './error-handler';

/**
 * 切换窗口的无头模式
 * 
 * @param headless 是否启用无头模式
 */
export async function toggleHeadlessMode(headless: boolean): Promise<void> {
  try {
    if (headless) {
      // 启用无头模式：隐藏窗口并移除装饰
      const currentWindow = getCurrentWindow();
      await currentWindow.hide();
      await currentWindow.setDecorations(false);
      logger.info('已启用无头模式');
    } else {
      // 禁用无头模式：显示窗口并添加装饰
      const currentWindow = getCurrentWindow();
      await currentWindow.setDecorations(true);
      await currentWindow.show();
      logger.info('已禁用无头模式');
    }
  } catch (error) {
    const appError = handlePluginError('切换无头模式', error);
    logger.error('切换无头模式失败', appError);
    throw error;
  }
}

/**
 * 示例：如何在应用中使用无头窗口模式
 */
export function headlessExample(): void {
  // 创建控制按钮
  const enableButton = document.createElement('button');
  enableButton.textContent = '启用无头模式';
  enableButton.onclick = () => toggleHeadlessMode(true);
  
  const disableButton = document.createElement('button');
  disableButton.textContent = '禁用无头模式';
  disableButton.onclick = () => toggleHeadlessMode(false);
  
  // 添加到文档
  document.body.appendChild(enableButton);
  document.body.appendChild(disableButton);
  
  // 监听键盘快捷键（例如按Alt+H显示窗口）
  document.addEventListener('keydown', (event) => {
    if (event.altKey && event.key === 'h') {
      toggleHeadlessMode(false);
    }
  });
  
  logger.info('无头窗口控制已初始化，使用Alt+H快捷键可显示窗口');
}