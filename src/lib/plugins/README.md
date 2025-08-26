# Plugin Management Service

The Plugin Management Service provides a comprehensive layer for managing search plugins in the application. It extends the existing plugin architecture with enhanced metadata, lifecycle management, search capabilities, and user-friendly error handling.

## Features

### Core Functionality
- **Plugin Lifecycle Management**: Install, uninstall, update, enable, and disable plugins
- **Plugin Discovery**: Search and filter plugins by various criteria
- **Plugin Validation**: Security and compatibility validation before installation
- **Health Monitoring**: Continuous monitoring of plugin health and performance
- **Error Handling**: User-friendly error messages with recovery suggestions

### Enhanced Plugin Information
- **Metadata**: Author, license, keywords, installation date, file size, dependencies
- **Installation Status**: Built-in vs installed, installation method, current status
- **Permissions**: Required permissions with security assessment
- **Health Status**: Performance metrics, issues, and health level
- **Configuration**: Dynamic settings schema with validation

## Usage

### Basic Usage

```typescript
import { pluginManagementService } from './plugin-management-service'

// Get all installed plugins
const plugins = await pluginManagementService.getInstalledPlugins()

// Search plugins
const searchResults = await pluginManagementService.searchPlugins({
  query: 'calculator',
  category: PluginCategory.UTILITIES,
  enabled: true,
  sortBy: 'name',
  sortOrder: 'asc'
})

// Get plugin details
const plugin = await pluginManagementService.getPluginDetails('calculator-plugin')

// Enable/disable plugins
const enableResult = await pluginManagementService.enablePlugin('calculator-plugin')
const disableResult = await pluginManagementService.disablePlugin('calculator-plugin')
```

### Plugin Installation

```typescript
// Install a plugin
const installResult = await pluginManagementService.installPlugin('weather-plugin')
if (installResult.success) {
  console.log('Plugin installed successfully')
} else {
  console.error('Installation failed:', installResult.error?.getUserFriendlyMessage())
}

// Uninstall a plugin
const uninstallResult = await pluginManagementService.uninstallPlugin('weather-plugin')
```

### Plugin Validation

```typescript
// Validate a plugin before installation
const validationResult = await pluginManagementService.validatePlugin(catalogItem)
if (!validationResult.isValid) {
  console.log('Validation errors:', validationResult.errors)
  console.log('Security issues:', validationResult.security.issues)
}
```

### Statistics and Monitoring

```typescript
// Get plugin statistics
const stats = await pluginManagementService.getPluginStatistics()
console.log(`Total plugins: ${stats.total}`)
console.log(`Enabled plugins: ${stats.enabled}`)
console.log(`Plugins by category:`, stats.byCategory)

// Check plugin health
const health = await pluginManagementService.checkPluginHealth('calculator-plugin')
console.log(`Health status: ${health.status}`)
console.log(`Issues: ${health.issues.length}`)
```

## Error Handling

The service provides comprehensive error handling with user-friendly messages:

```typescript
import { PluginManagementError, PluginManagementErrorType } from './plugin-management-service'

try {
  await pluginManagementService.installPlugin('invalid-plugin')
} catch (error) {
  if (error instanceof PluginManagementError) {
    console.log('Error type:', error.type)
    console.log('User message:', error.getUserFriendlyMessage())
    console.log('Recoverable:', error.recoverable)
    console.log('Suggested action:', error.suggestedAction)
  }
}
```

## Error Types

- `PLUGIN_NOT_FOUND`: Plugin doesn't exist
- `INSTALLATION_FAILED`: Plugin installation failed
- `UNINSTALLATION_FAILED`: Plugin uninstallation failed
- `UPDATE_FAILED`: Plugin update failed
- `VALIDATION_FAILED`: Plugin validation failed
- `PERMISSION_DENIED`: Insufficient permissions
- `NETWORK_ERROR`: Network connectivity issues
- `DEPENDENCY_ERROR`: Missing or incompatible dependencies
- `CONFIGURATION_ERROR`: Plugin configuration issues
- `SECURITY_ERROR`: Security risks detected

## Plugin Search Options

```typescript
interface PluginSearchOptions {
  query?: string                    // Search query
  category?: PluginCategory        // Filter by category
  enabled?: boolean                // Filter by enabled status
  installed?: boolean              // Filter by installation status
  sortBy?: 'name' | 'category' | 'installDate' | 'lastUpdated' | 'rating' | 'downloadCount'
  sortOrder?: 'asc' | 'desc'      // Sort order
  limit?: number                   // Maximum results
  offset?: number                  // Skip results (pagination)
}
```

## Plugin Categories

- `SEARCH`: Search-related plugins
- `PRODUCTIVITY`: Productivity tools
- `UTILITIES`: General utilities
- `DEVELOPMENT`: Development tools
- `SYSTEM`: System integration
- `ENTERTAINMENT`: Entertainment plugins
- `COMMUNICATION`: Communication tools

## Demo and Testing

Use the demo script to test the service functionality:

```typescript
import { demoPluginManagementService, demoErrorHandling } from './plugin-management-demo'

// Run comprehensive demo
await demoPluginManagementService()

// Test error handling
await demoErrorHandling()
```

Or in the browser console:
```javascript
// Available globally when running in browser
await window.demoPluginManagement()
await window.demoPluginErrors()
```

## Architecture

The service is built as a singleton that wraps the existing `SearchPluginManager` and provides:

1. **Enhanced Plugin Interface**: Extends basic `SearchPlugin` with metadata, installation info, permissions, and health status
2. **Validation Layer**: Security and compatibility validation using `PluginValidator`
3. **Error Management**: Comprehensive error handling with user-friendly messages
4. **Health Monitoring**: Continuous monitoring with performance metrics
5. **Catalog Integration**: Mock catalog for plugin discovery (ready for real API integration)

## Integration with UI Components

The service is designed to be consumed by UI components:

- **PluginCard**: Display plugin information and actions
- **PluginManagementPage**: Main plugin management interface
- **PluginSettingsDialog**: Plugin configuration interface
- **PluginDetailsModal**: Detailed plugin information

## Future Enhancements

- Real plugin catalog API integration
- Plugin marketplace with ratings and reviews
- Automatic plugin updates
- Plugin dependency management
- Plugin sandboxing and security isolation
- Plugin performance profiling
- Plugin backup and restore