import { describe, expect, it } from 'bun:test'
import { getDocumentPipApi } from './CallWindowProvider'

describe('getDocumentPipApi', () => {
  it('returns a supported API and safely rejects unavailable browser implementations', () => {
    const api = { window: null, requestWindow: async () => window }
    expect(getDocumentPipApi({ documentPictureInPicture: api })).toBe(api)
    expect(getDocumentPipApi({})).toBeUndefined()
    expect(getDocumentPipApi({ documentPictureInPicture: { requestWindow: true } })).toBeUndefined()
  })
})
