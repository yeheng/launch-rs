# Plugin Management Unit Tests

This directory contains comprehensive unit tests for the plugin management system, covering all major components and functionality.

## Test Coverage

### 1. PluginManagementService Tests
**File:** `plugin-management-service.test.ts`

**Coverage:**
- Service initialization and singleton pattern
- Plugin retrieval and enhancement
- Search and filtering functionality
- Plugin installation workflow
- Plugin uninstallation with cleanup
- Plugin updates and validation
- Health monitoring and statistics
- Error handling and user-friendly messages

**Key Test Scenarios:**
- ✅ Plugin installation with validation
- ✅ Plugin uninstallation with dependency checks
- ✅ Search and filtering with various criteria
- ✅ Error handling with proper error types
- ✅ Plugin health monitoring
- ✅ Statistics generation

### 2. PluginCard Component Tests
**File:** `../components/__tests__/PluginCard.test.ts`

**Coverage:**
- Component rendering with different plugin states
- Plugin information display
- Enable/disable toggle functionality
- Action button interactions
- Search query highlighting
- Loading states and accessibility
- Edge cases and error handling

**Key Test Scenarios:**
- ✅ Renders plugin information correctly
- ✅ Handles enable/disable toggle
- ✅ Emits correct events for actions
- ✅ Shows/hides buttons based on plugin state
- ✅ Handles loading states
- ✅ Supports search highlighting

### 3. PluginSettingsDialog Tests
**File:** `../components/__tests__/PluginSettingsDialog.test.ts`

**Coverage:**
- Dialog rendering and visibility
- Various setting types (string, number, boolean, select, etc.)
- Setting validation and error handling
- File and directory selection
- Settings persistence and reset functionality
- Conditional settings display

**Key Test Scenarios:**
- ✅ Renders all setting types correctly
- ✅ Validates user input
- ✅ Handles file/directory selection
- ✅ Saves and resets settings
- ✅ Shows/hides settings based on dependencies

### 4. Plugin Lifecycle Integration Tests
**File:** `plugin-lifecycle-integration.test.ts`

**Coverage:**
- Complete plugin installation workflow
- Plugin configuration persistence
- Plugin update processes
- Plugin uninstallation with cleanup
- Health monitoring over time
- State export/import functionality
- Error recovery and resilience
- Performance and scalability

**Key Test Scenarios:**
- ✅ End-to-end plugin installation
- ✅ Settings persistence across restarts
- ✅ Plugin health monitoring
- ✅ State export/import
- ✅ Error recovery mechanisms
- ✅ Performance with large plugin collections

### 5. PluginManagementPage Tests
**File:** `../views/__tests__/PluginManagementPage.test.ts`

**Coverage:**
- Page rendering and navigation
- Plugin loading and display
- Search and filtering functionality
- Plugin actions (enable, configure, uninstall)
- Error handling and loading states
- Performance and accessibility

**Key Test Scenarios:**
- ✅ Page header and statistics display
- ✅ Plugin card rendering
- ✅ Search functionality with debouncing
- ✅ Category filtering
- ✅ Plugin action handling
- ✅ Error boundary integration

## Test Infrastructure

### Setup Files
- `src/test/setup.ts` - Global test configuration
- `vitest.config.ts` - Vitest configuration

### Mock Strategy
- **Service Mocks:** Mock external dependencies like plugin manager and Tauri APIs
- **Component Mocks:** Mock UI components for isolated testing
- **State Mocks:** Mock Pinia stores for state management testing

### Test Utilities
- **Mock Data:** Comprehensive mock plugin data for consistent testing
- **Helper Functions:** Utility functions for creating test scenarios
- **Async Testing:** Proper handling of async operations and promises

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test plugin-management-service.test.ts
```

## Test Quality Metrics

### Coverage Goals
- **Statements:** >90%
- **Branches:** >85%
- **Functions:** >90%
- **Lines:** >90%

### Test Categories
- **Unit Tests:** Individual component/service testing
- **Integration Tests:** Cross-component interaction testing
- **End-to-End Tests:** Complete workflow testing

### Best Practices Implemented
- ✅ Comprehensive mock strategy
- ✅ Isolated test environments
- ✅ Async operation testing
- ✅ Error scenario coverage
- ✅ Edge case handling
- ✅ Performance testing
- ✅ Accessibility testing

## Known Issues and Limitations

### Current Test Failures
Some tests are currently failing due to:
1. Missing toast function mocks in PluginManagementPage tests
2. Plugin uninstall permission handling differences
3. Category counting discrepancies in statistics tests

### Future Improvements
- Add visual regression testing
- Implement E2E testing with Playwright
- Add performance benchmarking
- Enhance accessibility testing coverage

## Contributing

When adding new tests:
1. Follow the existing naming conventions
2. Use comprehensive mock data
3. Test both success and error scenarios
4. Include accessibility considerations
5. Document complex test scenarios
6. Maintain high coverage standards

## Dependencies

### Testing Framework
- **Vitest:** Modern testing framework
- **@vue/test-utils:** Vue component testing utilities
- **jsdom:** DOM environment for testing

### Mocking
- **vi.mock():** Function and module mocking
- **vi.fn():** Function spy creation
- **createPinia():** Pinia store mocking

### Assertions
- **expect():** Assertion library
- **toHaveBeenCalled():** Function call verification
- **toContain():** Content verification