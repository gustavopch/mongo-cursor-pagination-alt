import mapValues from 'lodash.mapvalues'
import { Collection, FilterQuery } from 'mongodb'

import { BaseDocument, CursorObject } from './types'
import { buildCursor, decodeCursor, encodeCursor, sanitizeLimit } from './utils'

export type FindPaginatedParams = {
  first?: number | null
  after?: string | null
  last?: number | null
  before?: string | null
  query?: FilterQuery<any>
  sort?: { [key: string]: number }
  projection?: any
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
  params: FindPaginatedParams,
): Promise<FindPaginatedResult<TDocument>> => {
  // Some parameters only exist to provide a more intuitive DX, for example:
  // - first/after represent the limit/cursor when paginating forwards;
  // - last/before represent the limit/cursor when paginating backwards;
  // But we need to resolve them into unambiguous variables that will be better
  // suited to interact with the MongoDB driver.
  const {
    limit,
    cursor,
    query,
    sort,
    projection,
    paginatingBackwards,
  } = resolveParams(params)

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
      hasPreviousPage: paginatingBackwards ? hasMore : Boolean(params.after),
      hasNextPage: paginatingBackwards ? Boolean(params.before) : hasMore,
    },
  }
}

// =============================================================================
// Utils
// =============================================================================

export const resolveParams = ({
  first,
  after,
  last,
  before,
  query = {},
  sort = {},
  projection,
}: FindPaginatedParams) => {
  // In case our sort object doesn't contain the `_id`, we need to add it
  if (!('_id' in sort)) {
    sort = {
      ...sort,
      // Important that it's the last key of the object to take the least priority
      _id: 1,
    }
  }

  if (last) {
    // Paginating backwards
    return {
      limit: sanitizeLimit(last),
      cursor: before ? decodeCursor(before) : null,
      query,
      sort: mapValues(sort, value => value * -1),
      projection,
      paginatingBackwards: true,
    }
  }

  // Paginating forwards
  return {
    limit: sanitizeLimit(first),
    cursor: after ? decodeCursor(after) : null,
    query,
    sort,
    projection,
    paginatingBackwards: false,
  }
}

export const extendQuery = (
  query: FilterQuery<any>,
  sort: { [key: string]: number },
  cursor: CursorObject,
): FilterQuery<any> => {
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
    }, {} as FilterQuery<any>)

    clauses.push(clause)
    return clauses
  }, [] as Array<FilterQuery<any>>)

  return {
    $and: [query, { $or: clauses }],
  }
}
