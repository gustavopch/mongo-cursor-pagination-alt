import { ObjectId } from 'mongodb'
import { Sort } from './types'

import {
  buildCursor,
  buildQueryFromCursor,
  decodeCursor,
  encodeCursor,
  normalizeDirectionParams,
} from './utils'

describe('buildCursor', () => {
  it('preserves same order of keys as in `sort`', () => {
    const document = {
      _id: new ObjectId(),
      createdAt: '2020-03-22',
      color: 'blue',
      name: 'John Doe',
    }

    const sort: Sort = {
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

    const sort: Sort = {
      'info.color': -1,
    }

    expect(buildCursor(document, sort)).toEqual({
      'info.color': 'blue',
    })
  })
})

const cursorString =
  'eyJjcmVhdGVkQXQiOnsiJGRhdGUiOiIyMDIwLTAzLTI3VDEyOjAwOjAwWiJ9LCJfaWQiOnsiJG9pZCI6IjVlN2UwNGFiMmEyYzFjYTk2MWI2MDM5ZiJ9fQ=='

const cursorObject = {
  createdAt: new Date('2020-03-27T12:00:00Z'),
  _id: new ObjectId('5e7e04ab2a2c1ca961b6039f'),
}

const stringifyCursorObject = JSON.stringify(cursorObject)

describe('encodeCursor', () => {
  it('encodes correctly', () => {
    expect(encodeCursor(cursorObject)).toEqual(cursorString)
  })
})

describe('decodeCursor', () => {
  it('decodes correctly', () => {
    expect(JSON.stringify(decodeCursor(cursorString))).toEqual(
      stringifyCursorObject,
    )
  })
})

describe('buildQueryFromCursor', () => {
  it('generates the correct query', () => {
    const sort: Sort = {
      createdAt: 1,
      color: -1,
      _id: 1,
    }

    const cursor = {
      createdAt: '2020-03-22',
      color: 'blue',
      _id: 4,
    }

    expect(buildQueryFromCursor(sort, cursor)).toEqual({
      $or: [
        { createdAt: { $gt: '2020-03-22' } },
        { createdAt: { $eq: '2020-03-22' }, color: { $lt: 'blue' } },
        { createdAt: { $eq: '2020-03-22' }, color: { $eq: 'blue' }, _id: { $gt: 4 } }, // prettier-ignore
      ],
    })
  })
})

describe('normalizeDirectionParams', () => {
  it('works well without parameters', () => {
    const result = normalizeDirectionParams({})

    expect(result).toEqual({
      limit: 20, // Default limit
      cursor: null,
      sort: {
        _id: 1, // Added implicitly
      },
      paginatingBackwards: false,
    })
  })

  it('works well when paginating forwards', () => {
    const result = normalizeDirectionParams({
      first: 10,
      after: cursorString,
      sort: {
        createdAt: 1,
      },
    })

    expect(JSON.stringify(result)).toEqual(
      JSON.stringify({
        limit: 10,
        cursor: JSON.parse(stringifyCursorObject), // Ensure correct serialization
        sort: {
          createdAt: 1,
          _id: 1, // Added implicitly
        },
        paginatingBackwards: false,
      }),
    )
  })

  it('works well when paginating backwards', () => {
    const result = normalizeDirectionParams({
      last: 10,
      before: cursorString,
      sort: {
        createdAt: 1,
      },
    })

    expect(JSON.stringify(result)).toEqual(
      JSON.stringify({
        limit: 10,
        cursor: JSON.parse(stringifyCursorObject), // Ensure correct serialization
        sort: {
          // Reversed values
          createdAt: -1,
          _id: -1, // Added implicitly
        },
        paginatingBackwards: true,
      }),
    )
  })

  it('clamps `limit` to a minimum', () => {
    expect(normalizeDirectionParams({ first: -10 }).limit).toBe(1)
    expect(normalizeDirectionParams({ first: -1 }).limit).toBe(1)
    expect(normalizeDirectionParams({ first: 0 }).limit).toBe(1)
    expect(normalizeDirectionParams({ first: 1 }).limit).toBe(1)
    expect(normalizeDirectionParams({ first: 10 }).limit).toBe(10)

    expect(normalizeDirectionParams({ last: -10 }).limit).toBe(1)
    expect(normalizeDirectionParams({ last: -1 }).limit).toBe(1)
    expect(normalizeDirectionParams({ last: 0 }).limit).toBe(1)
    expect(normalizeDirectionParams({ last: 1 }).limit).toBe(1)
    expect(normalizeDirectionParams({ last: 10 }).limit).toBe(10)
  })
})
