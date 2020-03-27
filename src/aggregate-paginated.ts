import { Collection } from 'mongodb'

import { BaseDocument, Sort } from './types'
import {
  buildCursor,
  buildQueryFromCursor,
  encodeCursor,
  normalizeDirectionParams,
} from './utils'

export type AggregatePaginatedParams = {
  first?: number | null
  after?: string | null
  last?: number | null
  before?: string | null
  pipeline: Array<{ [key: string]: any }>
  sort?: Sort
}

export type AggregatePaginatedResult<TDocument> = {
  edges: Array<{ cursor: string; node: TDocument }>
  pageInfo: {
    startCursor: string | null
    endCursor: string | null
    hasPreviousPage: boolean
    hasNextPage: boolean
  }
}

export const aggregatePaginated = async <TDocument extends BaseDocument>(
  collection: Collection,
  {
    first,
    after,
    last,
    before,
    pipeline,
    sort: originalSort = {},
  }: AggregatePaginatedParams,
): Promise<AggregatePaginatedResult<TDocument>> => {
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
    .aggregate([
      ...pipeline,
      // When we receive a cursor, we must make sure only results after
      // (or before) the given cursor are returned, so we need to add an
      // extra condition.
      { $match: cursor ? buildQueryFromCursor(sort, cursor) : {} },
      { $sort: sort },
      // Get 1 extra document to know if there's more after what was requested
      { $limit: limit + 1 },
    ])
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
