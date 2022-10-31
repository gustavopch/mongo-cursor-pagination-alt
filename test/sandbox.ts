import { Collection, MongoClient } from 'mongodb'

export type Sandbox = {
  seedCollection: (docs: any[]) => Promise<Collection>
  teardown: () => Promise<void>
}

export const createSandbox = async (): Promise<Sandbox> => {
  const uri = await global.memoryMongoDb.getUri()
  const client = await MongoClient.connect(uri)

  const db = client.db()

  let collectionCounter = 0

  const generateCollectionName = () => {
    return String(collectionCounter++)
  }

  return {
    seedCollection: async docs => {
      const collectionName = generateCollectionName()
      const collection = db.collection(collectionName)
      await collection.insertMany(docs)
      return db.collection(collectionName)
    },
    teardown: async () => {
      await db.dropDatabase()
      await client.close()
    },
  }
}
