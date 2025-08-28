/**
 * Search highlighting utilities
 */

/**
 * Highlight search terms in text
 */
export function highlightSearchTerms(text: string, searchQuery: string): string {
  if (!searchQuery || !text) {
    return text
  }

  // Escape special regex characters in search query
  const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  
  // Create regex for case-insensitive matching
  const regex = new RegExp(`(${escapedQuery})`, 'gi')
  
  // Replace matches with highlighted version
  return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">$1</mark>')
}

/**
 * Check if text contains search terms
 */
export function containsSearchTerms(text: string, searchQuery: string): boolean {
  if (!searchQuery || !text) {
    return false
  }

  return text.toLowerCase().includes(searchQuery.toLowerCase())
}

/**
 * Get search match score for relevance ranking
 */
export function getSearchMatchScore(
  text: string, 
  searchQuery: string, 
  fieldWeight: number = 1
): number {
  if (!searchQuery || !text) {
    return 0
  }

  const lowerText = text.toLowerCase()
  const lowerQuery = searchQuery.toLowerCase()
  
  let score = 0
  
  // Exact match gets highest score
  if (lowerText === lowerQuery) {
    score += 100 * fieldWeight
  }
  // Starts with query gets high score
  else if (lowerText.startsWith(lowerQuery)) {
    score += 80 * fieldWeight
  }
  // Contains query gets medium score
  else if (lowerText.includes(lowerQuery)) {
    score += 50 * fieldWeight
  }
  // Word boundary matches get bonus
  const wordBoundaryRegex = new RegExp(`\\b${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  if (wordBoundaryRegex.test(text)) {
    score += 20 * fieldWeight
  }
  
  return score
}

/**
 * Highlight multiple search terms with different colors
 */
export function highlightMultipleTerms(text: string, searchTerms: string[]): string {
  if (!searchTerms.length || !text) {
    return text
  }

  const colors = [
    'bg-yellow-200 text-yellow-900',
    'bg-blue-200 text-blue-900',
    'bg-green-200 text-green-900',
    'bg-purple-200 text-purple-900',
    'bg-pink-200 text-pink-900'
  ]

  let highlightedText = text
  
  searchTerms.forEach((term, index) => {
    if (term.trim()) {
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(${escapedTerm})`, 'gi')
      const colorClass = colors[index % colors.length]
      
      highlightedText = highlightedText.replace(
        regex, 
        `<mark class="${colorClass} px-1 rounded">$1</mark>`
      )
    }
  })
  
  return highlightedText
}

/**
 * Extract search context around matches
 */
export function extractSearchContext(
  text: string, 
  searchQuery: string, 
  contextLength: number = 100
): string {
  if (!searchQuery || !text) {
    return text
  }

  const lowerText = text.toLowerCase()
  const lowerQuery = searchQuery.toLowerCase()
  const matchIndex = lowerText.indexOf(lowerQuery)
  
  if (matchIndex === -1) {
    return text.substring(0, contextLength) + (text.length > contextLength ? '...' : '')
  }

  const start = Math.max(0, matchIndex - contextLength / 2)
  const end = Math.min(text.length, matchIndex + searchQuery.length + contextLength / 2)
  
  let context = text.substring(start, end)
  
  if (start > 0) {
    context = '...' + context
  }
  if (end < text.length) {
    context = context + '...'
  }
  
  return context
}