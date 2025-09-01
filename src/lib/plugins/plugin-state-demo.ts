import { usePluginStateStore } from './plugin-state-manager'
import { pluginStatisticsManager } from './plugin-statistics'

/**
 * Demo script to showcase plugin state management functionality
 */
export async function demoPluginStateManagement() {
  console.log('🔄 Plugin State Management Demo')
  console.log('===============================')

  try {
    // Get the state store
    const stateStore = usePluginStateStore()
    
    // 1. Initialize some test plugins with state
    console.log('\n📦 Initializing test plugin states...')
    const testPlugins = [
      'calculator-plugin',
      'file-search-plugin', 
      'apps-plugin',
      'unit-converter-plugin'
    ]

    for (const pluginId of testPlugins) {
      // Set some enabled states
      const enabled = Math.random() > 0.3 // 70% chance of being enabled
      stateStore.setPluginEnabled(pluginId, enabled)
      
      // Set some test configurations
      stateStore.setPluginConfig(pluginId, {
        setting1: `value-${pluginId}`,
        setting2: Math.floor(Math.random() * 100),
        enabled: enabled
      })
      
      // Record some usage metrics
      const searchCount = Math.floor(Math.random() * 50) + 1
      for (let i = 0; i < searchCount; i++) {
        const searchTime = Math.floor(Math.random() * 200) + 50 // 50-250ms
        const resultCount = Math.floor(Math.random() * 10) + 1
        const hasError = Math.random() < 0.1 // 10% error rate
        
        stateStore.recordPluginUsage(pluginId, searchTime, resultCount, hasError)
      }
      
      console.log(`  ✅ ${pluginId}: ${enabled ? 'enabled' : 'disabled'}, ${searchCount} searches`)
    }

    // 2. Display current statistics
    console.log('\n📊 Current Plugin Statistics:')
    const stats = stateStore.statistics
    console.log(`  Total: ${stats.total}`)
    console.log(`  Enabled: ${stats.enabled}`)
    console.log(`  With Issues: ${stats.withIssues}`)

    // 3. Show usage metrics for each plugin
    console.log('\n📈 Plugin Usage Metrics:')
    for (const pluginId of testPlugins) {
      const metrics = stateStore.getPluginMetrics(pluginId)
      console.log(`  ${pluginId}:`)
      console.log(`    Searches: ${metrics.searchCount}`)
      console.log(`    Results: ${metrics.resultsCount}`)
      console.log(`    Avg Time: ${metrics.avgSearchTime}ms`)
      console.log(`    Success Rate: ${metrics.successRate.toFixed(1)}%`)
      console.log(`    Errors: ${metrics.errorCount}`)
    }

    // 4. Show most used plugins
    console.log('\n🏆 Most Used Plugins:')
    const mostUsed = stateStore.mostUsedPlugins(3)
    mostUsed.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.pluginId}: ${item.metrics.searchCount} searches`)
    })

    // 5. Show plugins with issues
    console.log('\n⚠️ Plugins with Issues:')
    const pluginsWithIssues = stateStore.pluginsWithIssues
    if (pluginsWithIssues.length > 0) {
      pluginsWithIssues.forEach(pluginId => {
        const metrics = stateStore.getPluginMetrics(pluginId)
        console.log(`  ${pluginId}: ${metrics.errorCount} errors, ${metrics.successRate.toFixed(1)}% success rate`)
      })
    } else {
      console.log('  No plugins with issues found!')
    }

    // 6. Test statistics manager
    console.log('\n📊 Statistics Manager Demo:')
    const healthSummary = pluginStatisticsManager.getHealthSummary()
    console.log(`  Healthy: ${healthSummary.healthy}`)
    console.log(`  With Warnings: ${healthSummary.withWarnings}`)
    console.log(`  With Errors: ${healthSummary.withErrors}`)

    const usageTrends = pluginStatisticsManager.getUsageTrends()
    console.log(`  Total Searches: ${usageTrends.totalSearches}`)
    console.log(`  Total Results: ${usageTrends.totalResults}`)
    console.log(`  Avg Search Time: ${usageTrends.avgSearchTime}ms`)
    console.log(`  Most Active: ${usageTrends.mostActivePlugin}`)

    // 7. Show recommendations
    console.log('\n💡 Plugin Recommendations:')
    const recommendations = pluginStatisticsManager.getRecommendations()
    if (recommendations.length > 0) {
      recommendations.slice(0, 5).forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec.type.toUpperCase()} ${rec.pluginId}: ${rec.reason} (${rec.priority} priority)`)
      })
    } else {
      console.log('  No recommendations at this time.')
    }

    // 8. Test state export/import
    console.log('\n💾 Testing State Export/Import:')
    const exportedState = stateStore.exportState()
    console.log(`  Exported state size: ${JSON.stringify(exportedState).length} characters`)
    
    // Clear one plugin's metrics and then import to restore
    const testPluginId = testPlugins[0]
    const originalMetrics = stateStore.getPluginMetrics(testPluginId)
    stateStore.resetPluginMetrics(testPluginId)
    console.log(`  Reset metrics for ${testPluginId}`)
    
    // Import state to restore
    stateStore.importState(exportedState)
    const restoredMetrics = stateStore.getPluginMetrics(testPluginId)
    console.log(`  Restored metrics: ${restoredMetrics.searchCount} searches (was ${originalMetrics.searchCount})`)

    console.log('\n✅ Plugin State Management Demo completed successfully!')
    
    return {
      statistics: stats,
      healthSummary,
      usageTrends,
      recommendations,
      mostUsed
    }
    
  } catch (error) {
    console.error('❌ State management demo failed:', error)
    throw error
  }
}

/**
 * Test state persistence across page reloads
 */
export function testStatePersistence() {
  console.log('\n💾 Testing State Persistence')
  console.log('============================')
  
  try {
    const stateStore = usePluginStateStore()
    
    // Add some test data
    stateStore.setPluginEnabled('test-persistence-plugin', false)
    stateStore.setPluginConfig('test-persistence-plugin', { testSetting: 'persistent-value' })
    stateStore.recordPluginUsage('test-persistence-plugin', 100, 5, false)
    
    console.log('✅ Test data added to state store')
    console.log('🔄 Reload the page and run this function again to verify persistence')
    
    // Check if data exists (would be from previous session)
    const isEnabled = stateStore.isPluginEnabled('test-persistence-plugin')
    const config = stateStore.getPluginConfig('test-persistence-plugin')
    const metrics = stateStore.getPluginMetrics('test-persistence-plugin')
    
    console.log('Current persisted data:')
    console.log(`  Enabled: ${isEnabled}`)
    console.log(`  Config: ${JSON.stringify(config)}`)
    console.log(`  Search Count: ${metrics.searchCount}`)
    
  } catch (error) {
    console.error('❌ Persistence test failed:', error)
  }
}

// Make available globally for browser console testing
if (typeof window !== 'undefined') {
  ;(window as any).demoPluginState = demoPluginStateManagement
  ;(window as any).testStatePersistence = testStatePersistence
}