import { describe, it, expect } from 'vitest'
import { 
  highlightSearchTerms, 
  containsSearchTerms, 
  getSearchMatchScore,
  extractSearchContext 
} from '../search-highlight'

describe('Search Highlighting Utilities', () => {
  describe('highlightSearchTerms', () => {
    it('should highlight search terms in text', () => {
      const text = 'This is a test plugin for searching'
      const query = 'test'
      const result = highlightSearchTerms(text, query)
      
      expect(result).toContain('<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">test</mark>')
    })

    it('should handle case insensitive search', () => {
      const text = 'This is a TEST plugin'
      const query = 'test'
      const result = highlightSearchTerms(text, query)
      
      expect(result).toContain('<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">TEST</mark>')
    })

    it('should return original text when no query provided', () => {
      const text = 'This is a test plugin'
      const result = highlightSearchTerms(text, '')
      
      expect(result).toBe(text)
    })

    it('should escape special regex characters', () => {
      const text = 'This is a test (plugin)'
      const query = '(plugin)'
      const result = highlightSearchTerms(text, query)
      
      expect(result).toContain('<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">(plugin)</mark>')
    })
  })

  describe('containsSearchTerms', () => {
    it('should return true when text contains search terms', () => {
      expect(containsSearchTerms('test plugin', 'test')).toBe(true)
      expect(containsSearchTerms('TEST PLUGIN', 'test')).toBe(true)
    })

    it('should return false when text does not contain search terms', () => {
      expect(containsSearchTerms('plugin', 'test')).toBe(false)
    })

    it('should return false when no query provided', () => {
      expect(containsSearchTerms('test plugin', '')).toBe(false)
    })
  })

  describe('getSearchMatchScore', () => {
    it('should give highest score for exact match', () => {
      const score = getSearchMatchScore('test', 'test', 1)
      expect(score).toBe(120) // 100 + 20 word boundary bonus
    })

    it('should give high score for starts with match', () => {
      const score = getSearchMatchScore('testing', 'test', 1)
      expect(score).toBe(80)
    })

    it('should give medium score for contains match', () => {
      const score = getSearchMatchScore('my test plugin', 'test', 1)
      expect(score).toBe(70) // 50 + 20 word boundary bonus
    })

    it('should apply field weight', () => {
      const score = getSearchMatchScore('test', 'test', 2)
      expect(score).toBe(240) // (100 + 20) * 2
    })
  })

  describe('extractSearchContext', () => {
    it('should extract context around search match', () => {
      const text = 'This is a very long text with a test word in the middle of it'
      const query = 'test'
      const context = extractSearchContext(text, query, 20)
      
      expect(context).toContain('test')
      expect(context.length).toBeLessThanOrEqual(text.length)
    })

    it('should add ellipsis when text is truncated', () => {
      const text = 'This is a very long text with a test word in the middle of a very long sentence'
      const query = 'test'
      const context = extractSearchContext(text, query, 20)
      
      expect(context).toMatch(/\.\.\./)
    })

    it('should return original text when no match found', () => {
      const text = 'This is a short text'
      const query = 'missing'
      const context = extractSearchContext(text, query, 50)
      
      expect(context).toBe(text)
    })
  })
})