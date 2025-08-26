import { pluginManagementService } from './plugin-management-service'
import { PluginCategory } from './types'

/**
 * Demo script to showcase plugin management service functionality
 * This can be called from the browser console or integrated into the UI
 */
export async function demoPluginManagementService() {
  console.log('🚀 Plugin Management Service Demo')
  console.log('================================')

  try {
    // 1. Get installed plugins
    console.log('\n📦 Getting installed plugins...')
    const installedPlugins = await pluginManagementService.getInstalledPlugins()
    console.log(`Found ${installedPlugins.length} installed plugins:`)
    installedPlugins.forEach(plugin => {
      console.log(`  - ${plugin.name} (${plugin.id}) - ${plugin.enabled ? '✅ Enabled' : '❌ Disabled'}`)
    })

    // 2. Get available plugins from catalog
    console.log('\n🏪 Getting available plugins from catalog...')
    const availablePlugins = await pluginManagementService.getAvailablePlugins()
    console.log(`Found ${availablePlugins.length} available plugins:`)
    availablePlugins.forEach(plugin => {
      console.log(`  - ${plugin.name} (${plugin.id}) - ${plugin.category} - ⭐ ${plugin.rating}`)
    })

    // 3. Search plugins
    console.log('\n🔍 Searching plugins with query "calc"...')
    const searchResults = await pluginManagementService.searchPlugins({ 
      query: 'calc',
      sortBy: 'name',
      sortOrder: 'asc'
    })
    console.log(`Found ${searchResults.length} matching plugins:`)
    searchResults.forEach(plugin => {
      console.log(`  - ${plugin.name}: ${plugin.description}`)
    })

    // 4. Filter by category
    console.log('\n📂 Filtering plugins by UTILITIES category...')
    const utilityPlugins = await pluginManagementService.searchPlugins({ 
      category: PluginCategory.UTILITIES 
    })
    console.log(`Found ${utilityPlugins.length} utility plugins:`)
    utilityPlugins.forEach(plugin => {
      console.log(`  - ${plugin.name}`)
    })

    // 5. Get plugin statistics
    console.log('\n📊 Getting plugin statistics...')
    const stats = await pluginManagementService.getPluginStatistics()
    console.log('Plugin Statistics:')
    console.log(`  Total: ${stats.total}`)
    console.log(`  Installed: ${stats.installed}`)
    console.log(`  Enabled: ${stats.enabled}`)
    console.log(`  With Issues: ${stats.withIssues}`)
    console.log('  By Category:')
    Object.entries(stats.byCategory).forEach(([category, count]) => {
      if (count > 0) {
        console.log(`    ${category}: ${count}`)
      }
    })

    // 6. Test plugin details
    if (installedPlugins.length > 0) {
      const firstPlugin = installedPlugins[0]
      console.log(`\n🔍 Getting details for plugin: ${firstPlugin.name}`)
      const details = await pluginManagementService.getPluginDetails(firstPlugin.id)
      console.log('Plugin Details:')
      console.log(`  Name: ${details.name}`)
      console.log(`  Version: ${details.version}`)
      console.log(`  Author: ${details.metadata.author}`)
      console.log(`  Category: ${details.metadata.category}`)
      console.log(`  Install Date: ${details.metadata.installDate.toLocaleDateString()}`)
      console.log(`  Health Status: ${details.health?.status || 'Unknown'}`)
      console.log(`  Permissions: ${details.permissions.length} required`)
    }

    // 7. Test enable/disable functionality
    if (installedPlugins.length > 0) {
      const testPlugin = installedPlugins[0]
      console.log(`\n⚡ Testing enable/disable for plugin: ${testPlugin.name}`)
      
      if (testPlugin.enabled) {
        console.log('  Disabling plugin...')
        const disableResult = await pluginManagementService.disablePlugin(testPlugin.id)
        console.log(`  Result: ${disableResult.success ? '✅ Success' : '❌ Failed'}`)
        if (disableResult.error) {
          console.log(`  Error: ${disableResult.error.getUserFriendlyMessage()}`)
        }
        
        // Re-enable it
        console.log('  Re-enabling plugin...')
        const enableResult = await pluginManagementService.enablePlugin(testPlugin.id)
        console.log(`  Result: ${enableResult.success ? '✅ Success' : '❌ Failed'}`)
        if (enableResult.error) {
          console.log(`  Error: ${enableResult.error.getUserFriendlyMessage()}`)
        }
      } else {
        console.log('  Enabling plugin...')
        const enableResult = await pluginManagementService.enablePlugin(testPlugin.id)
        console.log(`  Result: ${enableResult.success ? '✅ Success' : '❌ Failed'}`)
        if (enableResult.error) {
          console.log(`  Error: ${enableResult.error.getUserFriendlyMessage()}`)
        }
      }
    }

    console.log('\n✅ Plugin Management Service Demo completed successfully!')
    
  } catch (error) {
    console.error('❌ Demo failed:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
    }
  }
}

/**
 * Test error handling
 */
export async function demoErrorHandling() {
  console.log('\n🚨 Testing Error Handling')
  console.log('=========================')

  try {
    // Test getting details for non-existent plugin
    console.log('Testing non-existent plugin...')
    await pluginManagementService.getPluginDetails('non-existent-plugin')
  } catch (error: any) {
    console.log('✅ Caught expected error:')
    console.log(`  Type: ${error.type}`)
    console.log(`  Message: ${error.message}`)
    console.log(`  User-friendly: ${error.getUserFriendlyMessage()}`)
    console.log(`  Recoverable: ${error.recoverable}`)
    console.log(`  Suggested action: ${error.suggestedAction}`)
  }

  try {
    // Test installation of non-existent plugin
    console.log('\nTesting installation of non-existent plugin...')
    const result = await pluginManagementService.installPlugin('non-existent-plugin')
    if (!result.success && result.error) {
      console.log('✅ Installation failed as expected:')
      console.log(`  Type: ${result.error.type}`)
      console.log(`  User-friendly: ${result.error.getUserFriendlyMessage()}`)
    }
  } catch (error) {
    console.log('Unexpected error during installation test:', error)
  }
}

// Export for use in browser console or other modules
export { pluginManagementService }

// Make available globally for browser console testing
if (typeof window !== 'undefined') {
  ;(window as any).demoPluginManagement = demoPluginManagementService
  ;(window as any).demoPluginErrors = demoErrorHandling
  ;(window as any).pluginManagementService = pluginManagementService
}