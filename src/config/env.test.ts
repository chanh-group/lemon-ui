import { describe, expect, it } from 'bun:test'
import { isCallPreviewEnabled } from './env'

describe('call preview environment', () => {
  it('only enables the mock call in dev', () => {
    expect(isCallPreviewEnabled('dev')).toBe(true)
    expect(isCallPreviewEnabled('production')).toBe(false)
    expect(isCallPreviewEnabled('staging')).toBe(false)
  })
})
