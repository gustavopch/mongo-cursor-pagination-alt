import path from 'path'
import fs from 'fs-extra'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { mongodbMemoryServerOptions } from './mongo-memory-server-options'

const globalConfigPath = path.join(__dirname, '..', 'jest-global-config.json')

// Create the database
const createTestDatabase = async (): Promise<void> => {
  // This will create an new instance of "MongoMemoryServer" and automatically start it
  const mongod = await MongoMemoryServer.create(mongodbMemoryServerOptions)

  const mongoConfig = {
    mongo: {
      url: mongod.getUri(),
      db: mongodbMemoryServerOptions.instance.dbName,
    },
  }

  // Write global config to disk because all tests run in different contexts.
  fs.writeFileSync(globalConfigPath, JSON.stringify(mongoConfig))

  // Set reference to mongod in order to close the server during teardown.
  global.memoryMongoDb = mongod
}

// Seed the database with schema and data
const seedTestDatabase = async (): Promise<void> => {}

const globalSetup = async (): Promise<void> => {
  try {
    await createTestDatabase()
    await seedTestDatabase()
    console.log('[integration] test database setup successful.')
  } catch (error) {
    console.log(error)
    process.exit(1)
  }
}

export default globalSetup
