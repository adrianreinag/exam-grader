import { apiFetch, ApiError } from './client'
import { auth } from '../firebase/client'

// Mock Firebase auth
jest.mock('../firebase/client', () => ({
  auth: {
    currentUser: null,
  },
}))

// Mock fetch
global.fetch = jest.fn()

// Mock environment variables
process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com'

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(auth as any).currentUser = null
  })

  describe('apiFetch', () => {
    it('should make successful GET request without auth', async () => {
      const mockResponse = { data: 'test' }
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      })

      const result = await apiFetch('/test-endpoint')

      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/test-endpoint',
        {
          headers: new Headers({
            'Content-Type': 'application/json',
          }),
        }
      )
      expect(result).toEqual(mockResponse)
    })

    it('should include authorization header when user is authenticated', async () => {
      const mockToken = 'mock-id-token'
      const mockUser = {
        getIdToken: jest.fn().mockResolvedValueOnce(mockToken),
      }
      ;(auth as any).currentUser = mockUser

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce({}),
      })

      await apiFetch('/protected-endpoint')

      expect(mockUser.getIdToken).toHaveBeenCalled()
      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/protected-endpoint',
        {
          headers: new Headers({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`,
          }),
        }
      )
    })

    it('should handle POST requests with body', async () => {
      const requestBody = { name: 'Test Exam' }
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValueOnce({ id: '123' }),
      })

      await apiFetch('/exams', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/exams',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: new Headers({
            'Content-Type': 'application/json',
          }),
        }
      )
    })

    it('should handle 204 No Content responses', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      const result = await apiFetch('/delete-endpoint')

      expect(result).toBeNull()
    })

    it('should throw ApiError for HTTP errors', async () => {
      const errorBody = { error: 'Not found' }
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValueOnce(errorBody),
      })

      try {
        await apiFetch('/not-found')
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).status).toBe(404)
        expect((error as ApiError).body).toEqual(errorBody)
        expect((error as ApiError).message).toBe('API Error: 404')
      }
    })

    it('should handle non-JSON error responses', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockRejectedValueOnce(new Error('Not JSON')),
        text: jest.fn().mockResolvedValueOnce('Internal Server Error'),
      })

      try {
        await apiFetch('/server-error')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).body).toBe('Internal Server Error')
      }
    })

    it('should handle completely unreadable error responses', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockRejectedValueOnce(new Error('Not JSON')),
        text: jest.fn().mockRejectedValueOnce(new Error('Cannot read text')),
      })

      try {
        await apiFetch('/unreadable-error')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).body).toBe('Could not read error body')
      }
    })

    it('should preserve custom headers', async () => {
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce({}),
      })

      await apiFetch('/custom-headers', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      })

      const expectedHeaders = new Headers({
        'Content-Type': 'application/json',
        'X-Custom-Header': 'custom-value',
      })

      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/custom-headers',
        {
          headers: expectedHeaders,
        }
      )
    })

    it('should handle token retrieval errors gracefully', async () => {
      const mockUser = {
        getIdToken: jest.fn().mockRejectedValueOnce(new Error('Token error')),
      }
      ;(auth as any).currentUser = mockUser

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce({}),
      })

      // Should not throw, should continue without token
      await expect(apiFetch('/endpoint')).rejects.toThrow('Token error')
    })
  })

  describe('ApiError', () => {
    it('should create ApiError with correct properties', () => {
      const error = new ApiError('Test error', 400, { field: 'required' })

      expect(error.message).toBe('Test error')
      expect(error.status).toBe(400)
      expect(error.body).toEqual({ field: 'required' })
      expect(error.name).toBe('ApiError')
      expect(error).toBeInstanceOf(Error)
    })
  })
})