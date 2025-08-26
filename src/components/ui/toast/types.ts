/**
 * Toast notification types and interfaces
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info'
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface ToastAction {
  /** Unique identifier for the action */
  id: string
  /** Label text for the action button */
  label: string
  /** Whether to close toast when action is clicked */
  closeOnClick?: boolean
}

export interface ToastItem {
  /** Unique identifier for the toast */
  id: string
  /** Type of toast notification */
  type: ToastType
  /** Main message content */
  message: string
  /** Optional title */
  title?: string
  /** Duration in milliseconds (0 = no auto-dismiss) */
  duration?: number
  /** Whether the toast can be manually dismissed */
  dismissible?: boolean
  /** Optional action button */
  action?: ToastAction
  /** Additional metadata */
  metadata?: Record<string, any>
}

export interface ToastOptions {
  /** Type of toast notification */
  type?: ToastType
  /** Optional title */
  title?: string
  /** Duration in milliseconds (0 = no auto-dismiss) */
  duration?: number
  /** Whether the toast can be manually dismissed */
  dismissible?: boolean
  /** Optional action button */
  action?: ToastAction
  /** Position where toast should appear */
  position?: ToastPosition
  /** Additional metadata */
  metadata?: Record<string, any>
}

export interface ToastConfig {
  /** Default position for toasts */
  position: ToastPosition
  /** Default duration for toasts */
  duration: number
  /** Maximum number of toasts to show at once */
  maxToasts: number
  /** Whether to show progress bars */
  showProgress: boolean
  /** Gap between stacked toasts */
  stackGap: number
}