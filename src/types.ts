import { ObjectId } from 'mongodb'

export type BaseDocument = {
  _id: ObjectId
}

export type CursorObject = {
  [key: string]: any
}
