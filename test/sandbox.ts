import { Collection, MongoClient, MongoClientOptions } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";

export interface Sandbox {
    seedCollection: <T>(docs: T[]) => Promise<Collection<T>>;
    teardown: () => Promise<void>;
}

export const createSandbox = async (): Promise<Sandbox> => {
    jest.setTimeout(60000); // May take some extra time to download binaries
    const mongod = await MongoMemoryServer.create();
    jest.setTimeout(5000);

    const options: MongoClientOptions = {
        ignoreUndefined: true,
    };

    const uri = mongod.getUri();
    const client = await MongoClient.connect(uri, options);

    const db = client.db();

    let collectionCounter = 0;
    const generateCollectionName = () => String(collectionCounter++);

    return {
        seedCollection: async (docs) => {
            const collectionName = generateCollectionName();
            const collection = db.collection(collectionName);
            await collection.insertMany(docs);
            return db.collection(collectionName);
        },
        teardown: async () => {
            await client.close();
            await mongod.stop();
        },
    };
};
