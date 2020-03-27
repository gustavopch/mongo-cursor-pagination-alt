import { ObjectId } from 'bson'

export type BaseDocument = {
  _id: ObjectId
}

export type CursorObject = {
  [key: string]: any
}
