import { type Collection } from 'mongodb'

import { BaseDocument, Projection, Query, Sort } from './types'
import {
  buildCursor,
  buildQueryFromCursor,
  encodeCursor,
  normalizeDirectionParams,
} from './utils'

export type FindPaginatedParams = {
  first?: number | null
  after?: string | null
  last?: number | null
  skip?: number | null
  before?: string | null
  query?: Query
  sort?: Sort
  projection?: Projection
}

export type FindPaginatedResult<TDocument> = {
  edges: Array<{ cursor: string; node: TDocument }>
  pageInfo: {
    count: number
    totalCount: number
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
    skip,
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

  const countDocuments = await collection.countDocuments(!cursor ? query : {})

  const allDocuments = (await collection
    .find<TDocument>(
      !cursor
        ? query
        : // When we receive a cursor, we must make sure only results after
          // (or before) the given cursor are returned, so we need to add an
          // extra condition.
          { $and: [query, buildQueryFromCursor(sort, cursor)] },
    )
    .sort(sort)
    // Get 1 extra document to know if there's more after what was requested
    .skip(skip ?? 0)
    .limit(limit + 1)
    .project(projection)
    .toArray()) as TDocument[]

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
      count: desiredDocuments.length,
      totalCount: countDocuments,
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges[edges.length - 1]?.cursor ?? null,
      hasPreviousPage: paginatingBackwards ? hasMore : Boolean(after),
      hasNextPage: paginatingBackwards ? Boolean(before) : hasMore,
    },
  }
}
