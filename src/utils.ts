import base64Url from 'base64-url'
import { EJSON } from 'bson'
import get from 'lodash.get'

import { BaseDocument, CursorObject } from './types'

export const sanitizeLimit = (limit: number | null | undefined): number => {
  return Math.max(1, limit ?? 20)
}

export const buildCursor = <TDocument extends BaseDocument>(
  document: TDocument,
  sort: { [key: string]: number },
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
