import { Sandbox, createSandbox } from '../test/sandbox'
import { FindPaginatedResult, findPaginated } from './find-paginated'

let sandbox: Sandbox

beforeAll(async () => {
  sandbox = await createSandbox()
})

afterAll(async () => {
  await sandbox.teardown()
})

describe('findPaginated', () => {
  it('paginates forwards and backwards with a custom `sort`', async () => {
    const collection = await sandbox.seedCollection([
      { createdAt: '2020-03-20', color: 'green', _id: 1 },
      { createdAt: '2020-03-21', color: 'green', _id: 2 },
      { createdAt: '2020-03-22', color: 'green', _id: 3 },
      { createdAt: '2020-03-22', color: 'blue', _id: 4 },
      { createdAt: '2020-03-22', color: 'blue', _id: 5 },
      { createdAt: '2020-03-22', color: 'amber', _id: 6 },
      { createdAt: '2020-03-23', color: 'green', _id: 7 },
      { createdAt: '2020-03-23', color: 'green', _id: 8 },
    ])

    const sort = {
      createdAt: 1,
      color: -1,
    }

    let result: FindPaginatedResult<any>

    // First page
    result = await findPaginated(collection, {
      first: 3,
      sort,
    })

    expect(result.edges).toHaveLength(3)
    expect(result.edges[0]).toMatchObject({ node: { createdAt: '2020-03-20', color: 'green', _id: 1 } }) // prettier-ignore
    expect(result.edges[1]).toMatchObject({ node: { createdAt: '2020-03-21', color: 'green', _id: 2 } }) // prettier-ignore
    expect(result.edges[2]).toMatchObject({ node: { createdAt: '2020-03-22', color: 'green', _id: 3 } }) // prettier-ignore
    expect(result.pageInfo.hasPreviousPage).toBe(false)
    expect(result.pageInfo.hasNextPage).toBe(true)

    // Second page
    result = await findPaginated(collection, {
      first: 3,
      after: result.pageInfo.endCursor,
      sort,
    })

    expect(result.edges).toHaveLength(3)
    expect(result.edges[0]).toMatchObject({ node: { createdAt: '2020-03-22', color: 'blue', _id: 4 } }) // prettier-ignore
    expect(result.edges[1]).toMatchObject({ node: { createdAt: '2020-03-22', color: 'blue', _id: 5 } }) // prettier-ignore
    expect(result.edges[2]).toMatchObject({ node: { createdAt: '2020-03-22', color: 'amber', _id: 6 } }) // prettier-ignore
    expect(result.pageInfo.hasPreviousPage).toBe(true)
    expect(result.pageInfo.hasNextPage).toBe(true)

    // Third page
    result = await findPaginated(collection, {
      first: 3,
      after: result.pageInfo.endCursor,
      sort,
    })

    expect(result.edges).toHaveLength(2)
    expect(result.edges[0]).toMatchObject({ node: { createdAt: '2020-03-23', color: 'green', _id: 7 } }) // prettier-ignore
    expect(result.edges[1]).toMatchObject({ node: { createdAt: '2020-03-23', color: 'green', _id: 8 } }) // prettier-ignore
    expect(result.pageInfo.hasPreviousPage).toBe(true)
    expect(result.pageInfo.hasNextPage).toBe(false)

    // Back to second page
    result = await findPaginated(collection, {
      last: 3,
      before: result.pageInfo.startCursor,
      sort,
    })

    expect(result.edges).toHaveLength(3)
    expect(result.edges[0]).toMatchObject({ node: { createdAt: '2020-03-22', color: 'blue', _id: 4 } }) // prettier-ignore
    expect(result.edges[1]).toMatchObject({ node: { createdAt: '2020-03-22', color: 'blue', _id: 5 } }) // prettier-ignore
    expect(result.edges[2]).toMatchObject({ node: { createdAt: '2020-03-22', color: 'amber', _id: 6 } }) // prettier-ignore
    expect(result.pageInfo.hasPreviousPage).toBe(true)
    expect(result.pageInfo.hasNextPage).toBe(true)

    // Back to first page
    result = await findPaginated(collection, {
      last: 3,
      before: result.pageInfo.startCursor,
      sort,
    })

    expect(result.edges).toHaveLength(3)
    expect(result.edges[0]).toMatchObject({ node: { createdAt: '2020-03-20', color: 'green', _id: 1 } }) // prettier-ignore
    expect(result.edges[1]).toMatchObject({ node: { createdAt: '2020-03-21', color: 'green', _id: 2 } }) // prettier-ignore
    expect(result.edges[2]).toMatchObject({ node: { createdAt: '2020-03-22', color: 'green', _id: 3 } }) // prettier-ignore
    expect(result.pageInfo.hasPreviousPage).toBe(false)
    expect(result.pageInfo.hasNextPage).toBe(true)
  })

  it('uses `_id` as tie-breaker when there are duplicated values on sorted field', async () => {
    const collection = await sandbox.seedCollection([
      { _id: 1, date: '2020-03-15' },
      { _id: 2, date: '2020-03-22' },
      { _id: 3, date: '2020-03-22' },
    ])

    let result: FindPaginatedResult<any>

    // First page
    result = await findPaginated(collection, {
      first: 2,
      sort: { date: 1 },
    })

    expect(result.edges[0]).toMatchObject({ node: { _id: 1, date: '2020-03-15' } }) // prettier-ignore
    expect(result.edges[1]).toMatchObject({ node: { _id: 2, date: '2020-03-22' } }) // prettier-ignore

    // Second page
    result = await findPaginated(collection, {
      first: 2,
      after: result.pageInfo.endCursor,
      sort: { date: 1 },
    })

    expect(result.edges[0]).toMatchObject({ node: { _id: 3, date: '2020-03-22' } }) // prettier-ignore

    // Back to first page
    result = await findPaginated(collection, {
      last: 2,
      before: result.pageInfo.startCursor,
      sort: { date: 1 },
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
      count: 0,
      startCursor: null,
      endCursor: null,
      hasPreviousPage: false,
      hasNextPage: false,
      totalCount: 0,
    })
  })

  it('allows the use of dot notation in `sort`', async () => {
    const collection = await sandbox.seedCollection([
      { info: { code: 2 } },
      { info: { code: 1 } },
      { info: { code: 3 } },
    ])

    const result = await findPaginated(collection, {
      sort: { 'info.code': 1 },
    })

    expect(result.edges).toHaveLength(3)
    expect(result.edges[0]).toMatchObject({ node: { info: { code: 1 } } })
    expect(result.edges[1]).toMatchObject({ node: { info: { code: 2 } } })
    expect(result.edges[2]).toMatchObject({ node: { info: { code: 3 } } })
  })
})
