import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export interface BreadcrumbItem {
  name: string
  path?: string
}

export function useNavigation() {
  const route = useRoute()
  const router = useRouter()

  // Get breadcrumb items from route meta
  const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    if (route.meta?.breadcrumb && Array.isArray(route.meta.breadcrumb)) {
      return route.meta.breadcrumb as BreadcrumbItem[]
    }
    
    // Fallback: generate breadcrumb from route path
    const pathSegments = route.path.split('/').filter(Boolean)
    const items: BreadcrumbItem[] = [{ name: 'Home', path: '/' }]
    
    let currentPath = ''
    for (const segment of pathSegments) {
      currentPath += `/${segment}`
      const routeName = segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ')
      
      if (currentPath === route.path) {
        // Current page - no link
        items.push({ name: routeName })
      } else {
        items.push({ name: routeName, path: currentPath })
      }
    }
    
    return items
  })

  // Navigation helpers
  const navigateTo = (path: string) => {
    router.push(path)
  }

  const navigateBack = () => {
    router.back()
  }

  const navigateHome = () => {
    router.push('/')
  }

  // Check if current route matches
  const isCurrentRoute = (path: string) => {
    return route.path === path
  }

  // Get page title from route meta
  const pageTitle = computed(() => {
    return route.meta?.title as string || 'ZeroLaunch'
  })

  return {
    route,
    router,
    breadcrumbItems,
    navigateTo,
    navigateBack,
    navigateHome,
    isCurrentRoute,
    pageTitle
  }
}