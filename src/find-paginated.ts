import { Collection } from 'mongodb'

import { BaseDocument, CursorObject, Projection, Query, Sort } from './types'
import { buildCursor, encodeCursor, normalizeDirectionParams } from './utils'

export type FindPaginatedParams = {
  first?: number | null
  after?: string | null
  last?: number | null
  before?: string | null
  query?: Query
  sort?: Sort
  projection?: Projection
}

export type FindPaginatedResult<TDocument> = {
  edges: Array<{ cursor: string; node: TDocument }>
  pageInfo: {
    startCursor: string | null
    endCursor: string | null
    hasPreviousPage: boolean
    hasNextPage: boolean
  }
}

export const findPaginated = async <TDocument extends BaseDocument>(
  collection: Collection,
  {
    first,
    after,
    last,
    before,
    query = {},
    sort: originalSort = {},
    projection = {},
  }: FindPaginatedParams,
): Promise<FindPaginatedResult<TDocument>> => {
  const { limit, cursor, sort, paginatingBackwards } = normalizeDirectionParams(
    {
      first,
      after,
      last,
      before,
      sort: originalSort,
    },
  )

  const allDocuments = await collection
    .find<TDocument>(
      !cursor
        ? // When no cursor is given, we do nothing special, just use whatever
          // query we received from parameters.
          query
        : // But when we receive a cursor, we must make sure only results after
          // (or before) the given cursor are returned, so we need to add an
          // extra condition.
          extendQuery(query, sort, cursor),
    )
    .sort(sort)
    // Get 1 extra document to know if there's more after what was requested
    .limit(limit + 1)
    .project(projection)
    .toArray()

  // Check whether the extra document mentioned above exists
  const extraDocument = allDocuments[limit]
  const hasMore = Boolean(extraDocument)

  // Build an array without the extra document
  const desiredDocuments = allDocuments.slice(0, limit)
  if (paginatingBackwards) {
    desiredDocuments.reverse()
  }

  const edges = desiredDocuments.map(document => ({
    cursor: encodeCursor(buildCursor(document, sort)),
    node: document,
  }))

  return {
    edges,
    pageInfo: {
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
      hasPreviousPage: paginatingBackwards ? hasMore : Boolean(after),
      hasNextPage: paginatingBackwards ? Boolean(before) : hasMore,
    },
  }
}

// =============================================================================
// Utils
// =============================================================================

export const extendQuery = (
  query: Query,
  sort: Sort,
  cursor: CursorObject,
): Query => {
  // Consider the `cursor`:
  // { createdAt: '2020-03-22', color: 'blue', _id: 4 }
  //
  // And the `sort`:
  // { createdAt: 1, color: -1 }
  //
  // The following table represents our documents (already sorted):
  // ┌────────────┬───────┬─────┐
  // │  createdAt │ color │ _id │
  // ├────────────┼───────┼─────┤
  // │ 2020-03-20 │ green │   1 │ <--- Line 1
  // │ 2020-03-21 │ green │   2 │ <--- Line 2
  // │ 2020-03-22 │ green │   3 │ <--- Line 3
  // │ 2020-03-22 │ blue  │   4 │ <--- Line 4 (our cursor points to here)
  // │ 2020-03-22 │ blue  │   5 │ <--- Line 5
  // │ 2020-03-22 │ amber │   6 │ <--- Line 6
  // │ 2020-03-23 │ green │   7 │ <--- Line 7
  // │ 2020-03-23 │ green │   8 │ <--- Line 8
  // └────────────┴───────┴─────┘
  //
  // In that case, in order to get documents starting after our cursor, we need
  // to make sure any of the following clauses is true:
  // - { createdAt: { $gt: '2020-03-22' } }                                          <--- Lines: 7 and 8
  // - { createdAt: { $eq: '2020-03-22' }, color: { $lt: 'blue' } }                  <--- Lines: 6
  // - { createdAt: { $eq: '2020-03-22' }, color: { $eq: 'blue' }, _id: { $gt: 4 } } <--- Lines: 5
  const cursorEntries = Object.entries(cursor)

  // So here we build an array of the OR clauses as mentioned above
  const clauses = cursorEntries.reduce((clauses, [outerKey], index) => {
    const currentCursorEntries = cursorEntries.slice(0, index + 1)

    const clause = currentCursorEntries.reduce((clause, [key, value]) => {
      // Last item in the clause uses an inequality operator
      if (key === outerKey) {
        const sortOrder = sort[key] ?? 1
        const operator = sortOrder < 0 ? '$lt' : '$gt'
        clause[key] = { [operator]: value }
        return clause
      }

      // The rest use the equality operator
      clause[key] = { $eq: value }
      return clause
    }, {} as Query)

    clauses.push(clause)
    return clauses
  }, [] as Query[])

  return {
    $and: [query, { $or: clauses }],
  }
}
