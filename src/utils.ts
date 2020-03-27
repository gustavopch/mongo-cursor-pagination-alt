import base64Url from 'base64-url'
import { EJSON } from 'bson'
import get from 'lodash.get'
import mapValues from 'lodash.mapvalues'

import { BaseDocument, CursorObject, Sort } from './types'

export const sanitizeLimit = (limit: number | null | undefined): number => {
  return Math.max(1, limit ?? 20)
}

export const buildCursor = <TDocument extends BaseDocument>(
  document: TDocument,
  sort: Sort,
): CursorObject => {
  return Object.keys(sort).reduce((acc, key) => {
    acc[key] = get(document, key)
    return acc
  }, {} as CursorObject)
}

export const encodeCursor = (cursorObject: CursorObject): string => {
  return base64Url.encode(EJSON.stringify(cursorObject))
}

export const decodeCursor = (cursorString: string): CursorObject => {
  return EJSON.parse(base64Url.decode(cursorString)) as CursorObject
}

export const normalizeDirectionParams = ({
  first,
  after,
  last,
  before,
  sort = {},
}: {
  first?: number | null
  after?: string | null
  last?: number | null
  before?: string | null
  sort?: Sort
}) => {
  // In case our sort object doesn't contain the `_id`, we need to add it
  if (!('_id' in sort)) {
    sort = {
      ...sort,
      // Important that it's the last key of the object to take the least priority
      _id: 1,
    }
  }

  if (last != null) {
    // Paginating backwards
    return {
      limit: sanitizeLimit(last),
      cursor: before ? decodeCursor(before) : null,
      sort: mapValues(sort, value => value * -1),
      paginatingBackwards: true,
    }
  }

  // Paginating forwards
  return {
    limit: sanitizeLimit(first),
    cursor: after ? decodeCursor(after) : null,
    sort,
    paginatingBackwards: false,
  }
}
