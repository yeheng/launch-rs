import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PerformanceCache, CacheKeys } from '../performance-cache'
import { PerformanceMonitor, MetricType } from '../performance-monitor'
import { PluginLazyLoader } from '../lazy-loader'
import type { PluginSearchOptions } from '../plugin-management-service'

describe('Performance Optimizations', () => {
  describe('PerformanceCache', () => {
    let cache: PerformanceCache

    beforeEach(() => {
      cache = new PerformanceCache({
        maxEntries: 10,
        defaultTtl: 1000,
        enableStats: true,
        cleanupInterval: 100
      })
    })

    afterEach(() => {
      cache.destroy()
    })

    it('should cache and retrieve data', () => {
      const testData = { id: 'test', name: 'Test Plugin' }
      cache.set('test-key', testData)
      
      const retrieved = cache.get('test-key')
      expect(retrieved).toEqual(testData)
    })

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent')
      expect(result).toBeNull()
    })

    it('should expire entries after TTL', async () => {
      cache.set('expire-test', 'data', 50) // 50ms TTL
      
      expect(cache.get('expire-test')).toBe('data')
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(cache.get('expire-test')).toBeNull()
    })

    it('should track cache statistics', () => {
      cache.set('stats-test', 'data')
      cache.get('stats-test') // Hit
      cache.get('non-existent') // Miss
      
      const stats = cache.getStatistics()
      expect(stats.totalHits).toBe(1)
      expect(stats.totalMisses).toBe(1)
      expect(stats.hitRate).toBe(0.5)
    })

    it('should evict least used entries when full', () => {
      // Fill cache to capacity
      for (let i = 0; i < 10; i++) {
        cache.set(`key-${i}`, `data-${i}`)
      }
      
      // Access some entries to increase their hit count
      cache.get('key-5')
      cache.get('key-5')
      cache.get('key-9')
      
      // Add one more entry to trigger eviction
      cache.set('key-new', 'new-data')
      
      // Frequently accessed entries should still be there
      expect(cache.get('key-5')).toBe('data-5')
      expect(cache.get('key-9')).toBe('data-9')
      expect(cache.get('key-new')).toBe('new-data')
      
      // Some less accessed entries should be evicted
      const stats = cache.getStatistics()
      expect(stats.totalEntries).toBeLessThanOrEqual(10)
    })
  })

  describe('CacheKeys', () => {
    it('should generate consistent cache keys', () => {
      const options: PluginSearchOptions = {
        query: 'test',
        category: 'utilities' as any,
        sortBy: 'name'
      }
      
      const key1 = CacheKeys.pluginSearch('test', options)
      const key2 = CacheKeys.pluginSearch('test', options)
      
      expect(key1).toBe(key2)
    })

    it('should generate different keys for different options', () => {
      const options1: PluginSearchOptions = { query: 'test1' }
      const options2: PluginSearchOptions = { query: 'test2' }
      
      const key1 = CacheKeys.pluginSearch('test', options1)
      const key2 = CacheKeys.pluginSearch('test', options2)
      
      expect(key1).not.toBe(key2)
    })
  })

  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor

    beforeEach(() => {
      monitor = new PerformanceMonitor()
    })

    afterEach(() => {
      monitor.destroy()
    })

    it('should record metrics', () => {
      monitor.recordMetric(MetricType.OPERATION_TIME, 'test-operation', 100)
      
      const metrics = monitor.getMetricsByType(MetricType.OPERATION_TIME)
      expect(metrics).toHaveLength(1)
      expect(metrics[0].name).toBe('test-operation')
      expect(metrics[0].value).toBe(100)
    })

    it('should measure operation time', () => {
      const stopTiming = monitor.startTiming('test-timing')
      
      // Simulate some work
      const start = performance.now()
      while (performance.now() - start < 10) {
        // Busy wait for ~10ms
      }
      
      stopTiming()
      
      const metrics = monitor.getMetricsByType(MetricType.OPERATION_TIME)
      expect(metrics).toHaveLength(1)
      expect(metrics[0].value).toBeGreaterThan(5) // Should be at least 5ms
    })

    it('should measure async operations', async () => {
      const result = await monitor.measureAsync('async-test', async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return 'test-result'
      })
      
      expect(result).toBe('test-result')
      
      const metrics = monitor.getMetricsByType(MetricType.OPERATION_TIME)
      expect(metrics).toHaveLength(1)
      expect(metrics[0].value).toBeGreaterThan(40) // Should be at least 40ms
    })

    it('should generate alerts for threshold violations', () => {
      // Set a low threshold for testing
      monitor.setThreshold(MetricType.OPERATION_TIME, 50, 100, 'ms')
      
      // Record a metric that exceeds the critical threshold
      monitor.recordMetric(MetricType.OPERATION_TIME, 'slow-operation', 150)
      
      const alerts = monitor.getRecentAlerts()
      expect(alerts).toHaveLength(1)
      expect(alerts[0].level).toBe('critical')
      expect(alerts[0].name).toBe('slow-operation')
    })

    it('should calculate performance statistics', () => {
      monitor.recordMetric(MetricType.OPERATION_TIME, 'op1', 100)
      monitor.recordMetric(MetricType.OPERATION_TIME, 'op2', 200)
      monitor.recordMetric(MetricType.OPERATION_TIME, 'op3', 150)
      
      const stats = monitor.getStatistics()
      expect(stats.totalOperations).toBe(3)
      expect(stats.averageOperationTime).toBe(150)
      expect(stats.slowestOperation.time).toBe(200)
      expect(stats.fastestOperation.time).toBe(100)
    })
  })

  describe('PluginLazyLoader', () => {
    let loader: PluginLazyLoader

    beforeEach(() => {
      loader = new PluginLazyLoader({
        batchSize: 2,
        batchDelay: 10,
        maxConcurrent: 2,
        enableCache: false // Disable cache for testing
      })
    })

    it('should load plugin details', async () => {
      const details = await loader.loadPluginDetails('test-plugin')
      
      expect(details).toBeTruthy()
      expect(details?.id).toBe('test-plugin')
      expect(details?.name).toBe('Plugin test-plugin')
    })

    it('should load plugin metadata', async () => {
      const metadata = await loader.loadPluginMetadata('test-plugin')
      
      expect(metadata).toBeTruthy()
      expect(metadata?.id).toBe('test-plugin')
      expect(metadata?.name).toBe('Plugin test-plugin')
    })

    it('should track loading states', async () => {
      expect(loader.getDetailsLoadingState('test-plugin')).toBe('pending')
      
      const loadPromise = loader.loadPluginDetails('test-plugin')
      expect(loader.getDetailsLoadingState('test-plugin')).toBe('loading')
      
      await loadPromise
      expect(loader.getDetailsLoadingState('test-plugin')).toBe('loaded')
    })

    it('should preload multiple plugins in batches', async () => {
      const pluginIds = ['plugin1', 'plugin2', 'plugin3', 'plugin4']
      
      const startTime = performance.now()
      await loader.preloadPluginDetails(pluginIds)
      const endTime = performance.now()
      
      // Should take at least the batch delay time
      expect(endTime - startTime).toBeGreaterThan(10)
      
      // All plugins should be loaded
      for (const id of pluginIds) {
        expect(loader.getDetailsLoadingState(id)).toBe('loaded')
      }
    })

    it('should provide loading statistics', async () => {
      await loader.loadPluginDetails('plugin1')
      await loader.loadPluginMetadata('plugin2')
      
      const stats = loader.getStatistics()
      expect(stats.details.loaded).toBe(1)
      expect(stats.metadata.loaded).toBe(1)
    })

    it('should handle loading failures gracefully', async () => {
      // Mock the performPluginDetailsLoad method to throw an error
      const originalMethod = (loader as any).performPluginDetailsLoad
      ;(loader as any).performPluginDetailsLoad = vi.fn().mockRejectedValue(new Error('Simulated failure'))
      
      vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const result = await loader.loadPluginDetails('invalid-plugin-that-fails')
      
      // Should return null on failure, not throw
      expect(result).toBeNull()
      expect(loader.getDetailsLoadingState('invalid-plugin-that-fails')).toBe('failed')
      
      // Restore original method
      ;(loader as any).performPluginDetailsLoad = originalMethod
      vi.restoreAllMocks()
    })
  })

  describe('Integration Tests', () => {
    it('should work together for optimal performance', async () => {
      const cache = new PerformanceCache()
      const monitor = new PerformanceMonitor()
      const loader = new PluginLazyLoader({ enableCache: true })
      
      try {
        // Add some data to cache first
        cache.set('test-cache-key', 'test-data')
        
        // Measure the complete flow
        const result = await monitor.measureAsync('integration-test', async () => {
          // Load plugin details (should be cached after first load)
          const details1 = await loader.loadPluginDetails('integration-test-plugin')
          const details2 = await loader.loadPluginDetails('integration-test-plugin')
          
          return { details1, details2 }
        })
        
        expect(result.details1).toBeTruthy()
        expect(result.details2).toBeTruthy()
        
        // Check that performance was monitored
        const metrics = monitor.getMetricsByType(MetricType.OPERATION_TIME)
        expect(metrics.length).toBeGreaterThan(0)
        
        // Check cache statistics (should have at least our test entry)
        const cacheStats = cache.getStatistics()
        expect(cacheStats.totalEntries).toBeGreaterThan(0)
      } finally {
        cache.destroy()
        monitor.destroy()
      }
    })
  })
})