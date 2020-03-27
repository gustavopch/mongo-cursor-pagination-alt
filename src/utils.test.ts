import { ObjectId } from 'bson'

import { buildCursor, sanitizeLimit } from './utils'

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

describe('buildCursor', () => {
  it('preserves same order of keys as in `sort`', () => {
    const document = {
      _id: new ObjectId(),
      createdAt: '2020-03-22',
      color: 'blue',
      name: 'John Doe',
    }

    const sort = {
      createdAt: 1,
      color: -1,
    }

    const cursorObject = buildCursor(document, sort)

    expect(JSON.stringify(cursorObject)).toEqual(
      '{"createdAt":"2020-03-22","color":"blue"}',
    )
    expect(JSON.stringify(cursorObject)).not.toEqual(
      '{"color":"blue","createdAt":"2020-03-22"}',
    )
  })

  it('understands dot notation', () => {
    const document = {
      _id: new ObjectId(),
      info: { color: 'blue' },
    }

    const sort = {
      'info.color': -1,
    }

    expect(buildCursor(document, sort)).toEqual({
      'info.color': 'blue',
    })
  })
})
