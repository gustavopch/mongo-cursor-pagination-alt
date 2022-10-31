import { MongoMemoryServer } from 'mongodb-memory-server'

/**
 * @Update 2022 - This has logic has been update to support newer Node.js versions
 * that don't have NodeJS as a global type
 */
declare global {
  // eslint-disable-next-line no-var
  var memoryMongoDb: MongoMemoryServer
}
