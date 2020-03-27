import { sanitizeLimit } from './utils'

describe('sanitizeLimit', () => {
  it('clamps to a minimum', () => {
    expect(sanitizeLimit(-10)).toBe(1)
    expect(sanitizeLimit(-1)).toBe(1)
    expect(sanitizeLimit(-0)).toBe(1)
    expect(sanitizeLimit(10)).toBe(10)
  })

  it('returns default when given null or undefined', () => {
    expect(sanitizeLimit(null)).toBe(20)
    expect(sanitizeLimit(undefined)).toBe(20)
  })
})
