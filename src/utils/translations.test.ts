import { translateStatus, statusTranslations } from './translations'

describe('translations', () => {
  describe('translateStatus function', () => {
    it('should translate known status codes', () => {
      expect(translateStatus('DRAFT')).toBe('Borrador')
      expect(translateStatus('PUBLISHED')).toBe('Publicado')
      expect(translateStatus('EVALUATED')).toBe('Evaluado')
      expect(translateStatus('UNGRADED')).toBe('Sin Corregir')
      expect(translateStatus('GRADED_DRAFT')).toBe('Borrador')
      expect(translateStatus('GRADED_FINAL')).toBe('Finalizado')
    })

    it('should return original status for unknown codes', () => {
      expect(translateStatus('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS')
      expect(translateStatus('CUSTOM_STATUS')).toBe('CUSTOM_STATUS')
    })

    it('should handle empty strings', () => {
      expect(translateStatus('')).toBe('')
    })

    it('should handle case sensitivity', () => {
      expect(translateStatus('draft')).toBe('draft')
      expect(translateStatus('Draft')).toBe('Draft')
    })
  })

  describe('statusTranslations object', () => {
    it('should contain all expected translations', () => {
      const expectedKeys = [
        'DRAFT',
        'PUBLISHED', 
        'EVALUATED',
        'UNGRADED',
        'GRADED_DRAFT',
        'GRADED_FINAL'
      ]

      expectedKeys.forEach(key => {
        expect(statusTranslations).toHaveProperty(key)
        expect(typeof statusTranslations[key]).toBe('string')
        expect(statusTranslations[key].length).toBeGreaterThan(0)
      })
    })

    it('should have consistent translation values', () => {
      expect(statusTranslations.DRAFT).toBe('Borrador')
      expect(statusTranslations.GRADED_DRAFT).toBe('Borrador')
    })
  })
})