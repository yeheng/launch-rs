import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePluginStateStore } from '../plugin-state-manager'
import type { EnhancedSearchPlugin } from '../types'
import { PluginCategory } from '../types/basic'

describe('PluginStateManager', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should initialize plugin state correctly', () => {
    const store = usePluginStateStore()
    
    const mockPlugin: EnhancedSearchPlugin = {
      id: 'test-plugin',
      name: 'Test Plugin',
      description: 'A test plugin',
      icon: {} as any,
      version: '1.0.0',
      enabled: true,
      priority: 1,
      search: vi.fn(),
      metadata: {
        author: 'Unknown',
        license: 'Unknown',
        keywords: [],
        installDate: new Date(),
        lastUpdated: new Date(),
        fileSize: 0,
        dependencies: [],
        category: PluginCategory.UTILITIES
      },
      installation: {
        isInstalled: true,
        isBuiltIn: true,
        canUninstall: false,
        installMethod: 'builtin',
        status: 'installed' as any
      },
      permissions: []
    }

    store.initializePlugin(mockPlugin)

    expect(store.isPluginEnabled('test-plugin')).toBe(true)
    expect(store.getPluginConfig('test-plugin')).toEqual({})
    expect(store.getPluginMetrics('test-plugin')).toEqual({
      searchCount: 0,
      resultsCount: 0,
      avgSearchTime: 0,
      lastUsed: 0,
      errorCount: 0,
      successRate: 100
    })
  })

  it('should persist plugin enabled state', () => {
    const store = usePluginStateStore()
    
    store.setPluginEnabled('test-plugin', false)
    
    expect(store.isPluginEnabled('test-plugin')).toBe(false)
    expect(store.enabledStates['test-plugin']).toBe(false)
  })

  it('should persist plugin configuration', () => {
    const store = usePluginStateStore()
    
    const config = { setting1: 'value1', setting2: 42 }
    store.setPluginConfig('test-plugin', config)
    
    expect(store.getPluginConfig('test-plugin')).toEqual(config)
  })

  it('should record plugin usage metrics', () => {
    const store = usePluginStateStore()
    
    // Record first usage
    store.recordPluginUsage('test-plugin', 100, 5, false)
    
    let metrics = store.getPluginMetrics('test-plugin')
    expect(metrics.searchCount).toBe(1)
    expect(metrics.resultsCount).toBe(5)
    expect(metrics.avgSearchTime).toBe(100)
    expect(metrics.errorCount).toBe(0)
    expect(metrics.successRate).toBe(100)
    
    // Record second usage with error
    store.recordPluginUsage('test-plugin', 200, 3, true)
    
    metrics = store.getPluginMetrics('test-plugin')
    expect(metrics.searchCount).toBe(2)
    expect(metrics.resultsCount).toBe(8)
    expect(metrics.avgSearchTime).toBe(150) // (100 + 200) / 2
    expect(metrics.errorCount).toBe(1)
    expect(metrics.successRate).toBe(50) // 1 success out of 2 attempts
  })

  it('should update statistics correctly', () => {
    const store = usePluginStateStore()
    
    store.setPluginEnabled('plugin1', true)
    store.setPluginEnabled('plugin2', false)
    store.setPluginEnabled('plugin3', true)
    
    store.updateStatistics()
    
    expect(store.statistics.total).toBe(3)
    expect(store.statistics.enabled).toBe(2)
  })

  it('should identify plugins with issues', () => {
    const store = usePluginStateStore()
    
    // Plugin with high error rate
    store.recordPluginUsage('problematic-plugin', 100, 5, true)
    store.recordPluginUsage('problematic-plugin', 100, 5, true)
    store.recordPluginUsage('problematic-plugin', 100, 5, true)
    
    // Plugin with good performance
    store.recordPluginUsage('good-plugin', 50, 10, false)
    store.recordPluginUsage('good-plugin', 50, 10, false)
    
    const pluginsWithIssues = store.pluginsWithIssues
    expect(pluginsWithIssues).toContain('problematic-plugin')
    expect(pluginsWithIssues).not.toContain('good-plugin')
  })

  it('should export and import state correctly', () => {
    const store = usePluginStateStore()
    
    // Set up some state
    store.setPluginEnabled('plugin1', false)
    store.setPluginConfig('plugin1', { setting: 'value' })
    store.recordPluginUsage('plugin1', 100, 5, false)
    
    // Export state
    const exportedState = store.exportState()
    
    // Clear store
    store.$reset()
    
    // Import state
    store.importState(exportedState)
    
    // Verify state was restored
    expect(store.isPluginEnabled('plugin1')).toBe(false)
    expect(store.getPluginConfig('plugin1')).toEqual({ setting: 'value' })
    expect(store.getPluginMetrics('plugin1').searchCount).toBe(1)
  })

  it('should reset plugin metrics', () => {
    const store = usePluginStateStore()
    
    // Record some usage
    store.recordPluginUsage('test-plugin', 100, 5, false)
    
    // Verify metrics exist
    expect(store.getPluginMetrics('test-plugin').searchCount).toBe(1)
    
    // Reset metrics
    store.resetPluginMetrics('test-plugin')
    
    // Verify metrics were reset
    const metrics = store.getPluginMetrics('test-plugin')
    expect(metrics.searchCount).toBe(0)
    expect(metrics.resultsCount).toBe(0)
    expect(metrics.avgSearchTime).toBe(0)
    expect(metrics.errorCount).toBe(0)
    expect(metrics.successRate).toBe(100)
  })
})