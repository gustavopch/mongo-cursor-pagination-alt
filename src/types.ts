import { ObjectId } from 'mongodb'

export enum Direction {
  ASC = 'asc',
  DESC = 'desc',
}

export type BaseDocument = {
  _id: ObjectId
}

export type CursorObject = {
  id: ObjectId
  value: any
}
