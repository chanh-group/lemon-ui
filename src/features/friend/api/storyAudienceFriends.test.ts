import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/infrastructure/api/client'
import { getAllStoryAudienceFriends } from './friend.api'
const originalGet = api.get
afterEach(() => {
  api.get = originalGet
  vi.restoreAllMocks()
})
describe('story audience friend pagination', () => {
  it('loads all pages before returning the list', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        data: { items: [{ id: '1' }], hasMore: true, nextCursor: 'cursor' },
      })
      .mockResolvedValueOnce({ data: { items: [{ id: '2' }], hasMore: false } })
    api.get = get as unknown as typeof api.get
    expect(await getAllStoryAudienceFriends()).toEqual([{ id: '1' }, { id: '2' }])
    expect(get).toHaveBeenCalledTimes(2)
    expect(get.mock.calls[1][1].params.cursor).toBe('cursor')
  })
  it('rejects an invalid pagination cursor instead of returning partial data', async () => {
    api.get = vi
      .fn()
      .mockResolvedValue({ data: { items: [], hasMore: true } }) as unknown as typeof api.get
    await expect(getAllStoryAudienceFriends()).rejects.toThrow()
  })
})
