import { ref, reactive } from 'vue'
import type { ToastItem, ToastOptions, ToastConfig } from './types'

/**
 * Default toast configuration
 */
const defaultConfig: ToastConfig = {
  position: 'bottom-right',
  duration: 5000,
  maxToasts: 5,
  showProgress: true,
  stackGap: 8
}

/**
 * Global toast state
 */
const toasts = ref<ToastItem[]>([])
const config = reactive<ToastConfig>({ ...defaultConfig })

/**
 * Generate unique ID for toasts
 */
let toastIdCounter = 0
const generateToastId = (): string => {
  return `toast-${++toastIdCounter}-${Date.now()}`
}

/**
 * Toast management composable
 */
export function useToast() {
  /**
   * Add a new toast notification
   */
  const addToast = (message: string, options: ToastOptions = {}): string => {
    const id = generateToastId()
    
    const toast: ToastItem = {
      id,
      type: options.type || 'info',
      message,
      title: options.title,
      duration: options.duration !== undefined ? options.duration : config.duration,
      dismissible: options.dismissible !== false,
      action: options.action,
      metadata: options.metadata
    }
    
    // Add to beginning of array for proper stacking
    toasts.value.unshift(toast)
    
    // Limit number of toasts
    if (toasts.value.length > config.maxToasts) {
      toasts.value = toasts.value.slice(0, config.maxToasts)
    }
    
    return id
  }
  
  /**
   * Remove a toast by ID
   */
  const removeToast = (id: string): void => {
    const index = toasts.value.findIndex(toast => toast.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }
  
  /**
   * Clear all toasts
   */
  const clearToasts = (): void => {
    toasts.value = []
  }
  
  /**
   * Update toast configuration
   */
  const updateConfig = (newConfig: Partial<ToastConfig>): void => {
    Object.assign(config, newConfig)
  }
  
  /**
   * Convenience methods for different toast types
   */
  const success = (message: string, options: Omit<ToastOptions, 'type'> = {}): string => {
    return addToast(message, { ...options, type: 'success' })
  }
  
  const error = (message: string, options: Omit<ToastOptions, 'type'> = {}): string => {
    return addToast(message, { ...options, type: 'error' })
  }
  
  const warning = (message: string, options: Omit<ToastOptions, 'type'> = {}): string => {
    return addToast(message, { ...options, type: 'warning' })
  }
  
  const info = (message: string, options: Omit<ToastOptions, 'type'> = {}): string => {
    return addToast(message, { ...options, type: 'info' })
  }
  
  /**
   * Plugin operation specific toast methods
   */
  const pluginSuccess = (pluginName: string, operation: string, options: Omit<ToastOptions, 'type'> = {}): string => {
    return success(`${pluginName} ${operation} successfully`, {
      title: 'Plugin Operation Complete',
      ...options
    })
  }
  
  const pluginError = (pluginName: string, operation: string, errorMessage?: string, options: Omit<ToastOptions, 'type'> = {}): string => {
    const message = errorMessage 
      ? `Failed to ${operation} ${pluginName}: ${errorMessage}`
      : `Failed to ${operation} ${pluginName}`
    
    return error(message, {
      title: 'Plugin Operation Failed',
      duration: 8000, // Longer duration for errors
      action: {
        id: 'retry',
        label: 'Retry',
        closeOnClick: false
      },
      ...options
    })
  }
  
  const pluginWarning = (pluginName: string, message: string, options: Omit<ToastOptions, 'type'> = {}): string => {
    return warning(message, {
      title: `${pluginName} Warning`,
      ...options
    })
  }
  
  /**
   * Loading toast with progress
   */
  const loading = (message: string, options: Omit<ToastOptions, 'type'> = {}): string => {
    return info(message, {
      duration: 0, // Don't auto-dismiss loading toasts
      dismissible: false,
      ...options
    })
  }
  
  /**
   * Update an existing toast
   */
  const updateToast = (id: string, updates: Partial<ToastItem>): void => {
    const toast = toasts.value.find(t => t.id === id)
    if (toast) {
      Object.assign(toast, updates)
    }
  }
  
  /**
   * Handle toast actions
   */
  const handleToastAction = (toastId: string, actionId: string): void => {
    const toast = toasts.value.find(t => t.id === toastId)
    if (!toast || !toast.action) return
    
    // Emit custom event for action handling
    const event = new CustomEvent('toast-action', {
      detail: { toastId, actionId, toast }
    })
    window.dispatchEvent(event)
  }
  
  return {
    // State
    toasts: toasts.value,
    config,
    
    // Methods
    addToast,
    removeToast,
    clearToasts,
    updateConfig,
    updateToast,
    handleToastAction,
    
    // Convenience methods
    success,
    error,
    warning,
    info,
    loading,
    
    // Plugin-specific methods
    pluginSuccess,
    pluginError,
    pluginWarning
  }
}

/**
 * Global toast instance for use outside of components
 */
export const toast = {
  success: (message: string, options?: Omit<ToastOptions, 'type'>) => {
    const { success } = useToast()
    return success(message, options)
  },
  
  error: (message: string, options?: Omit<ToastOptions, 'type'>) => {
    const { error } = useToast()
    return error(message, options)
  },
  
  warning: (message: string, options?: Omit<ToastOptions, 'type'>) => {
    const { warning } = useToast()
    return warning(message, options)
  },
  
  info: (message: string, options?: Omit<ToastOptions, 'type'>) => {
    const { info } = useToast()
    return info(message, options)
  },
  
  loading: (message: string, options?: Omit<ToastOptions, 'type'>) => {
    const { loading } = useToast()
    return loading(message, options)
  },
  
  pluginSuccess: (pluginName: string, operation: string, options?: Omit<ToastOptions, 'type'>) => {
    const { pluginSuccess } = useToast()
    return pluginSuccess(pluginName, operation, options)
  },
  
  pluginError: (pluginName: string, operation: string, errorMessage?: string, options?: Omit<ToastOptions, 'type'>) => {
    const { pluginError } = useToast()
    return pluginError(pluginName, operation, errorMessage, options)
  },
  
  pluginWarning: (pluginName: string, message: string, options?: Omit<ToastOptions, 'type'>) => {
    const { pluginWarning } = useToast()
    return pluginWarning(pluginName, message, options)
  }
}