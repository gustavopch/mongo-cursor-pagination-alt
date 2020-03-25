import { Collection, MongoClient } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'

export type Sandbox = {
  seedCollection: (docs: any[]) => Promise<Collection>
  teardown: () => Promise<void>
}

export const createSandbox = async (): Promise<Sandbox> => {
  jest.setTimeout(60000) // May take some extra time to download binaries
  const mongod = new MongoMemoryServer()
  jest.setTimeout(5000)

  const uri = await mongod.getUri()
  const client = await MongoClient.connect(uri, {
    ignoreUndefined: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

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
      await client.close()
      await mongod.stop()
    },
  }
}
