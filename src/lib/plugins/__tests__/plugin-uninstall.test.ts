import { describe, it, expect, beforeEach, vi } from 'vitest'
import { pluginManagementService, PluginManagementError } from '../plugin-management-service'
import { pluginManager } from '../../search-plugin-manager'
import type { SearchPlugin } from '../../search-plugins'

// Mock the plugin manager
vi.mock('../../search-plugin-manager', () => ({
  pluginManager: {
    getPlugin: vi.fn(),
    disablePlugin: vi.fn(),
    unregister: vi.fn(),
    getPlugins: vi.fn(() => [])
  }
}))

describe('Plugin Uninstallation', () => {
  const mockPlugin: SearchPlugin = {
    id: 'test-plugin',
    name: 'Test Plugin',
    description: 'A test plugin',
    version: '1.0.0',
    enabled: true,
    priority: 1,
    icon: 'TestIcon',
    search: vi.fn(),
    settings: {
      schema: []
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should successfully uninstall a plugin', async () => {
    // Mock plugin manager methods
    vi.mocked(pluginManager.getPlugin).mockReturnValue(mockPlugin)
    vi.mocked(pluginManager.disablePlugin).mockResolvedValue()
    vi.mocked(pluginManager.unregister).mockResolvedValue()

    const result = await pluginManagementService.uninstallPlugin('test-plugin')

    expect(result.success).toBe(true)
    expect(result.data?.pluginId).toBe('test-plugin')
    expect(result.data?.message).toBe('Plugin uninstalled successfully')
    
    // Verify that disable was called first
    expect(pluginManager.disablePlugin).toHaveBeenCalledWith('test-plugin')
    // Verify that unregister was called
    expect(pluginManager.unregister).toHaveBeenCalledWith('test-plugin')
  })

  it('should disable plugin before uninstalling if enabled', async () => {
    const enabledPlugin = { ...mockPlugin, enabled: true }
    vi.mocked(pluginManager.getPlugin).mockReturnValue(enabledPlugin)
    vi.mocked(pluginManager.disablePlugin).mockResolvedValue()
    vi.mocked(pluginManager.unregister).mockResolvedValue()

    await pluginManagementService.uninstallPlugin('test-plugin')

    expect(pluginManager.disablePlugin).toHaveBeenCalledWith('test-plugin')
    expect(pluginManager.disablePlugin).toHaveBeenCalledBefore(
      vi.mocked(pluginManager.unregister)
    )
  })

  it('should not disable plugin if already disabled', async () => {
    const disabledPlugin = { ...mockPlugin, enabled: false }
    vi.mocked(pluginManager.getPlugin).mockReturnValue(disabledPlugin)
    vi.mocked(pluginManager.unregister).mockResolvedValue()

    await pluginManagementService.uninstallPlugin('test-plugin')

    expect(pluginManager.disablePlugin).not.toHaveBeenCalled()
    expect(pluginManager.unregister).toHaveBeenCalledWith('test-plugin')
  })

  it('should fail if plugin not found', async () => {
    vi.mocked(pluginManager.getPlugin).mockReturnValue(undefined)

    const result = await pluginManagementService.uninstallPlugin('non-existent-plugin')

    expect(result.success).toBe(false)
    expect(result.error).toBeInstanceOf(PluginManagementError)
    expect(result.error?.type).toBe('plugin_not_found')
  })

  it('should fail if plugin cannot be uninstalled', async () => {
    // Mock a built-in plugin that cannot be uninstalled
    vi.mocked(pluginManager.getPlugin).mockReturnValue(mockPlugin)

    const result = await pluginManagementService.uninstallPlugin('test-plugin')

    // Since our mock plugin doesn't have installation metadata, 
    // it will be enhanced with built-in installation that cannot be uninstalled
    expect(result.success).toBe(false)
    expect(result.error?.type).toBe('permission_denied')
  })

  it('should handle disable failure gracefully', async () => {
    vi.mocked(pluginManager.getPlugin).mockReturnValue(mockPlugin)
    vi.mocked(pluginManager.disablePlugin).mockRejectedValue(new Error('Disable failed'))

    const result = await pluginManagementService.uninstallPlugin('test-plugin')

    expect(result.success).toBe(false)
    expect(result.error?.type).toBe('uninstallation_failed')
    expect(result.error?.message).toContain('Failed to disable plugin before uninstallation')
  })

  it('should handle unregister failure gracefully', async () => {
    const disabledPlugin = { ...mockPlugin, enabled: false }
    vi.mocked(pluginManager.getPlugin).mockReturnValue(disabledPlugin)
    vi.mocked(pluginManager.unregister).mockRejectedValue(new Error('Unregister failed'))

    const result = await pluginManagementService.uninstallPlugin('test-plugin')

    expect(result.success).toBe(false)
    expect(result.error?.type).toBe('uninstallation_failed')
  })

  it('should include cleanup details in successful result', async () => {
    const disabledPlugin = { ...mockPlugin, enabled: false }
    vi.mocked(pluginManager.getPlugin).mockReturnValue(disabledPlugin)
    vi.mocked(pluginManager.unregister).mockResolvedValue()

    const result = await pluginManagementService.uninstallPlugin('test-plugin')

    expect(result.success).toBe(true)
    expect(result.data?.cleanupDetails).toEqual({
      filesRemoved: true,
      configurationCleared: true,
      dependenciesResolved: true
    })
  })
})