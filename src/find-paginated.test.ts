import { Sandbox, createSandbox } from '../test/sandbox'
import { FindPaginatedResult, findPaginated } from './find-paginated'
import { Direction } from './types'

let sandbox: Sandbox

beforeAll(async () => {
  sandbox = await createSandbox()
})

afterAll(async () => {
  await sandbox.teardown()
})

describe('findPaginated', () => {
  it('paginates forwards and backwards in ascending direction', async () => {
    const collection = await sandbox.seedCollection([
      { code: 1 },
      { code: 2 },
      { code: 3 },
      { code: 4 },
      { code: 5 },
      { code: 6 },
      { code: 7 },
      { code: 8 },
    ])

    let result: FindPaginatedResult<any>

    // First page
    result = await findPaginated(collection, {
      first: 3,
      direction: Direction.ASC,
    })

    expect(result.edges).toHaveLength(3)
    expect(result.edges[0]).toMatchObject({ node: { code: 1 } })
    expect(result.edges[1]).toMatchObject({ node: { code: 2 } })
    expect(result.edges[2]).toMatchObject({ node: { code: 3 } })
    expect(result.pageInfo.hasPreviousPage).toBe(false)
    expect(result.pageInfo.hasNextPage).toBe(true)

    // Second page
    result = await findPaginated(collection, {
      first: 3,
      after: result.pageInfo.endCursor,
      direction: Direction.ASC,
    })

    expect(result.edges).toHaveLength(3)
    expect(result.edges[0]).toMatchObject({ node: { code: 4 } })
    expect(result.edges[1]).toMatchObject({ node: { code: 5 } })
    expect(result.edges[2]).toMatchObject({ node: { code: 6 } })
    expect(result.pageInfo.hasPreviousPage).toBe(true)
    expect(result.pageInfo.hasNextPage).toBe(true)

    // Third page
    result = await findPaginated(collection, {
      first: 3,
      after: result.pageInfo.endCursor,
      direction: Direction.ASC,
    })

    expect(result.edges).toHaveLength(2)
    expect(result.edges[0]).toMatchObject({ node: { code: 7 } })
    expect(result.edges[1]).toMatchObject({ node: { code: 8 } })
    expect(result.pageInfo.hasPreviousPage).toBe(true)
    expect(result.pageInfo.hasNextPage).toBe(false)

    // Back to second page
    result = await findPaginated(collection, {
      last: 3,
      before: result.pageInfo.startCursor,
      direction: Direction.ASC,
    })

    expect(result.edges).toHaveLength(3)
    expect(result.edges[0]).toMatchObject({ node: { code: 4 } })
    expect(result.edges[1]).toMatchObject({ node: { code: 5 } })
    expect(result.edges[2]).toMatchObject({ node: { code: 6 } })
    expect(result.pageInfo.hasPreviousPage).toBe(true)
    expect(result.pageInfo.hasNextPage).toBe(true)

    // Back to first page
    result = await findPaginated(collection, {
      last: 3,
      before: result.pageInfo.startCursor,
      direction: Direction.ASC,
    })

    expect(result.edges).toHaveLength(3)
    expect(result.edges[0]).toMatchObject({ node: { code: 1 } })
    expect(result.edges[1]).toMatchObject({ node: { code: 2 } })
    expect(result.edges[2]).toMatchObject({ node: { code: 3 } })
    expect(result.pageInfo.hasPreviousPage).toBe(false)
    expect(result.pageInfo.hasNextPage).toBe(true)
  })

  it('paginates forwards and backwards in descending direction', async () => {
    const collection = await sandbox.seedCollection([
      { code: 1 },
      { code: 2 },
      { code: 3 },
      { code: 4 },
      { code: 5 },
      { code: 6 },
      { code: 7 },
      { code: 8 },
    ])

    let result: FindPaginatedResult<any>

    // First page
    result = await findPaginated(collection, {
      first: 3,
      direction: Direction.DESC,
    })

    expect(result.edges).toHaveLength(3)
    expect(result.edges[0]).toMatchObject({ node: { code: 8 } })
    expect(result.edges[1]).toMatchObject({ node: { code: 7 } })
    expect(result.edges[2]).toMatchObject({ node: { code: 6 } })
    expect(result.pageInfo.hasPreviousPage).toBe(false)
    expect(result.pageInfo.hasNextPage).toBe(true)

    // Second page
    result = await findPaginated(collection, {
      first: 3,
      after: result.pageInfo.endCursor,
      direction: Direction.DESC,
    })

    expect(result.edges).toHaveLength(3)
    expect(result.edges[0]).toMatchObject({ node: { code: 5 } })
    expect(result.edges[1]).toMatchObject({ node: { code: 4 } })
    expect(result.edges[2]).toMatchObject({ node: { code: 3 } })
    expect(result.pageInfo.hasPreviousPage).toBe(true)
    expect(result.pageInfo.hasNextPage).toBe(true)

    // Third page
    result = await findPaginated(collection, {
      first: 3,
      after: result.pageInfo.endCursor,
      direction: Direction.DESC,
    })

    expect(result.edges).toHaveLength(2)
    expect(result.edges[0]).toMatchObject({ node: { code: 2 } })
    expect(result.edges[1]).toMatchObject({ node: { code: 1 } })
    expect(result.pageInfo.hasPreviousPage).toBe(true)
    expect(result.pageInfo.hasNextPage).toBe(false)

    // Back to second page
    result = await findPaginated(collection, {
      last: 3,
      before: result.pageInfo.startCursor,
      direction: Direction.DESC,
    })

    expect(result.edges).toHaveLength(3)
    expect(result.edges[0]).toMatchObject({ node: { code: 5 } })
    expect(result.edges[1]).toMatchObject({ node: { code: 4 } })
    expect(result.edges[2]).toMatchObject({ node: { code: 3 } })
    expect(result.pageInfo.hasPreviousPage).toBe(true)
    expect(result.pageInfo.hasNextPage).toBe(true)

    // Back to first page
    result = await findPaginated(collection, {
      last: 3,
      before: result.pageInfo.startCursor,
      direction: Direction.DESC,
    })

    expect(result.edges).toHaveLength(3)
    expect(result.edges[0]).toMatchObject({ node: { code: 8 } })
    expect(result.edges[1]).toMatchObject({ node: { code: 7 } })
    expect(result.edges[2]).toMatchObject({ node: { code: 6 } })
    expect(result.pageInfo.hasPreviousPage).toBe(false)
    expect(result.pageInfo.hasNextPage).toBe(true)
  })

  it('paginates forwards and backwards with a custom `paginatedField`', async () => {
    const collection = await sandbox.seedCollection([
      { code: 1 },
      { code: 4 },
      { code: 2 },
      { code: 3 },
      { code: 6 },
      { code: 5 },
    ])

    let result: FindPaginatedResult<any>

    // First page
    result = await findPaginated(collection, {
      first: 2,
      paginatedField: 'code',
    })

    expect(result.edges).toHaveLength(2)
    expect(result.edges[0]).toMatchObject({ node: { code: 1 } })
    expect(result.edges[1]).toMatchObject({ node: { code: 2 } })
    expect(result.pageInfo.hasPreviousPage).toBe(false)
    expect(result.pageInfo.hasNextPage).toBe(true)

    // Second page
    result = await findPaginated(collection, {
      first: 2,
      after: result.pageInfo.endCursor,
      paginatedField: 'code',
    })

    expect(result.edges).toHaveLength(2)
    expect(result.edges[0]).toMatchObject({ node: { code: 3 } })
    expect(result.edges[1]).toMatchObject({ node: { code: 4 } })
    expect(result.pageInfo.hasPreviousPage).toBe(true)
    expect(result.pageInfo.hasNextPage).toBe(true)

    // Third page
    result = await findPaginated(collection, {
      first: 2,
      after: result.pageInfo.endCursor,
      paginatedField: 'code',
    })

    expect(result.edges).toHaveLength(2)
    expect(result.edges[0]).toMatchObject({ node: { code: 5 } })
    expect(result.edges[1]).toMatchObject({ node: { code: 6 } })
    expect(result.pageInfo.hasPreviousPage).toBe(true)
    expect(result.pageInfo.hasNextPage).toBe(false)

    // Back to second page
    result = await findPaginated(collection, {
      last: 2,
      before: result.pageInfo.startCursor,
      paginatedField: 'code',
    })

    expect(result.edges).toHaveLength(2)
    expect(result.edges[0]).toMatchObject({ node: { code: 3 } })
    expect(result.edges[1]).toMatchObject({ node: { code: 4 } })
    expect(result.pageInfo.hasPreviousPage).toBe(true)
    expect(result.pageInfo.hasNextPage).toBe(true)

    // Back to first page
    result = await findPaginated(collection, {
      last: 2,
      before: result.pageInfo.startCursor,
      paginatedField: 'code',
    })

    expect(result.edges).toHaveLength(2)
    expect(result.edges[0]).toMatchObject({ node: { code: 1 } })
    expect(result.edges[1]).toMatchObject({ node: { code: 2 } })
    expect(result.pageInfo.hasPreviousPage).toBe(false)
    expect(result.pageInfo.hasNextPage).toBe(true)
  })

  it('uses `_id` as tie-breaker when `paginatedField` has duplicated values', async () => {
    const collection = await sandbox.seedCollection([
      { _id: 1, date: '2020-03-15' },
      { _id: 2, date: '2020-03-22' },
      { _id: 3, date: '2020-03-22' },
    ])

    let result: FindPaginatedResult<any>

    // First page
    result = await findPaginated(collection, {
      first: 2,
      paginatedField: 'date',
    })

    expect(result.edges[0]).toMatchObject({ node: { _id: 1, date: '2020-03-15' } }) // prettier-ignore
    expect(result.edges[1]).toMatchObject({ node: { _id: 2, date: '2020-03-22' } }) // prettier-ignore

    // Second page
    result = await findPaginated(collection, {
      first: 2,
      after: result.pageInfo.endCursor,
      paginatedField: 'date',
    })

    expect(result.edges[0]).toMatchObject({ node: { _id: 3, date: '2020-03-22' } }) // prettier-ignore

    // Back to first page
    result = await findPaginated(collection, {
      last: 2,
      before: result.pageInfo.startCursor,
      paginatedField: 'date',
    })

    expect(result.edges[0]).toMatchObject({ node: { _id: 1, date: '2020-03-15' } }) // prettier-ignore
    expect(result.edges[1]).toMatchObject({ node: { _id: 2, date: '2020-03-22' } }) // prettier-ignore
  })

  it('filters results with the given `query`', async () => {
    const collection = await sandbox.seedCollection([
      { code: 1, color: 'blue' },
      { code: 2 },
      { code: 3 },
      { code: 4, color: 'blue' },
      { code: 5 },
      { code: 6 },
      { code: 7, color: 'blue' },
      { code: 8 },
    ])

    const result = await findPaginated(collection, {
      first: 4,
      query: { color: 'blue' },
    })

    expect(result.edges).toHaveLength(3)
    expect(result.edges[0]).toMatchObject({ node: { code: 1, color: 'blue' } })
    expect(result.edges[1]).toMatchObject({ node: { code: 4, color: 'blue' } })
    expect(result.edges[2]).toMatchObject({ node: { code: 7, color: 'blue' } })
    expect(result.pageInfo.hasPreviousPage).toBe(false)
    expect(result.pageInfo.hasNextPage).toBe(false)
  })

  it('limits fields according to the given `projection`', async () => {
    const collection = await sandbox.seedCollection([
      { code: 1, color: 'blue' },
      { code: 2 },
      { code: 3 },
    ])

    const result = await findPaginated(collection, {
      projection: { _id: 1 },
    })

    expect(result.edges).toHaveLength(3)
    expect(result.edges[0]).not.toHaveProperty('node.color')
  })

  it('behaves well when there are no results', async () => {
    const collection = await sandbox.seedCollection([
      { code: 1 },
      { code: 2 },
      { code: 3 },
    ])

    const result = await findPaginated(collection, {
      query: { nonExistentField: true },
    })

    expect(result.edges).toHaveLength(0)
    expect(result.pageInfo).toEqual({
      startCursor: null,
      endCursor: null,
      hasPreviousPage: false,
      hasNextPage: false,
    })
  })

  it('allows the use of dot notation for `paginatedField`', async () => {
    const collection = await sandbox.seedCollection([
      { info: { code: 2 } },
      { info: { code: 1 } },
      { info: { code: 3 } },
    ])

    const result = await findPaginated(collection, {
      paginatedField: 'info.code',
    })

    expect(result.edges).toHaveLength(3)
    expect(result.edges[0]).toMatchObject({ node: { info: { code: 1 } } })
    expect(result.edges[1]).toMatchObject({ node: { info: { code: 2 } } })
    expect(result.edges[2]).toMatchObject({ node: { info: { code: 3 } } })
  })

  it('clamps `first` and `last` to a minimum', async () => {
    const collection = await sandbox.seedCollection([
      { code: 1 },
      { code: 2 },
      { code: 3 },
    ])

    let result: FindPaginatedResult<any>

    // Clamps `first`
    result = await findPaginated(collection, {
      first: -1,
    })

    expect(result.edges).toHaveLength(1)

    // Clamps `last`
    result = await findPaginated(collection, {
      last: -1,
    })

    expect(result.edges).toHaveLength(1)
  })
})
