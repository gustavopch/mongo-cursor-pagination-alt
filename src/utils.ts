import base64Url from 'base64-url'
import { EJSON } from 'bson'

import { CursorObject } from './types'

export const sanitizeLimit = (limit: number | null | undefined): number => {
  return Math.max(1, limit ?? 20)
}

export const decodeCursor = (cursorString: string): CursorObject => {
  return EJSON.parse(base64Url.decode(cursorString)) as CursorObject
}

export const encodeCursor = (cursorObject: CursorObject): string => {
  return base64Url.encode(EJSON.stringify(cursorObject))
}
