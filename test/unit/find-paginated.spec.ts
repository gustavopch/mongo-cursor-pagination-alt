import { Sandbox, createSandbox } from "../sandbox";
import { FindPaginatedResult, findPaginated } from "../../src/find-paginated";
import { expect } from "@jest/globals";
import { BaseDocument } from "../../src/types";
import { Sort } from "mongodb";
import { ObjectId } from "bson";

let sandbox: Sandbox;

interface TestDocumentA extends BaseDocument {
    color: string;
    createdAt: string;
}

interface TestDocumentB extends BaseDocument {
    date: string;
}

interface TestDocumentC extends BaseDocument {
    code: number;
    color?: string;
}

interface TestDocumentD extends BaseDocument {
    info: {
        code: number;
    };
}

describe("findPaginated", () => {
    beforeAll(async () => {
        sandbox = await createSandbox();
    });

    afterAll(async () => {
        await sandbox.teardown();
    });

    it("paginates forwards and backwards with a custom `sort`", async () => {
        const documents: TestDocumentA[] = [
            { createdAt: "2020-03-20", color: "green", _id: new ObjectId(1) },
            { createdAt: "2020-03-21", color: "green", _id: new ObjectId(2) },
            { createdAt: "2020-03-22", color: "green", _id: new ObjectId(3) },
            { createdAt: "2020-03-22", color: "blue", _id: new ObjectId(4) },
            { createdAt: "2020-03-22", color: "blue", _id: new ObjectId(5) },
            { createdAt: "2020-03-22", color: "amber", _id: new ObjectId(6) },
            { createdAt: "2020-03-23", color: "green", _id: new ObjectId(7) },
            { createdAt: "2020-03-23", color: "green", _id: new ObjectId(8) },
        ];

        const collection = await sandbox.seedCollection(documents);

        const sort: Sort = {
            createdAt: 1,
            color: -1,
        };

        let result: FindPaginatedResult<TestDocumentA>;

        // First page
        result = await findPaginated(collection, {
            first: 3,
            sort,
        });

        expect(result.edges).toHaveLength(3);
        expect(result.edges[0]).toMatchObject({ node: { createdAt: "2020-03-20", color: "green", _id: new ObjectId(1) } }); // prettier-ignore
        expect(result.edges[1]).toMatchObject({ node: { createdAt: "2020-03-21", color: "green", _id: new ObjectId(2) } }); // prettier-ignore
        expect(result.edges[2]).toMatchObject({ node: { createdAt: "2020-03-22", color: "green", _id: new ObjectId(3) } }); // prettier-ignore
        expect(result.pageInfo.hasPreviousPage).toBe(false);
        expect(result.pageInfo.hasNextPage).toBe(true);

        // Second page
        result = await findPaginated(collection, {
            first: 3,
            after: result.pageInfo.endCursor,
            sort,
        });

        expect(result.edges).toHaveLength(3);
        expect(result.edges[0]).toMatchObject({ node: { createdAt: "2020-03-22", color: "blue", _id: new ObjectId(4) } }); // prettier-ignore
        expect(result.edges[1]).toMatchObject({ node: { createdAt: "2020-03-22", color: "blue", _id: new ObjectId(5) } }); // prettier-ignore
        expect(result.edges[2]).toMatchObject({ node: { createdAt: "2020-03-22", color: "amber", _id: new ObjectId(6) } }); // prettier-ignore
        expect(result.pageInfo.hasPreviousPage).toBe(true);
        expect(result.pageInfo.hasNextPage).toBe(true);

        // Third page
        result = await findPaginated(collection, {
            first: 3,
            after: result.pageInfo.endCursor,
            sort,
        });

        expect(result.edges).toHaveLength(2);
        expect(result.edges[0]).toMatchObject({ node: { createdAt: "2020-03-23", color: "green", _id: new ObjectId(7) } }); // prettier-ignore
        expect(result.edges[1]).toMatchObject({ node: { createdAt: "2020-03-23", color: "green", _id: new ObjectId(8) } }); // prettier-ignore
        expect(result.pageInfo.hasPreviousPage).toBe(true);
        expect(result.pageInfo.hasNextPage).toBe(false);

        // Back to second page
        result = await findPaginated(collection, {
            last: 3,
            before: result.pageInfo.startCursor,
            sort,
        });

        expect(result.edges).toHaveLength(3);
        expect(result.edges[0]).toMatchObject({ node: { createdAt: "2020-03-22", color: "blue", _id: new ObjectId(4) } }); // prettier-ignore
        expect(result.edges[1]).toMatchObject({ node: { createdAt: "2020-03-22", color: "blue", _id: new ObjectId(5) } }); // prettier-ignore
        expect(result.edges[2]).toMatchObject({ node: { createdAt: "2020-03-22", color: "amber", _id: new ObjectId(6) } }); // prettier-ignore
        expect(result.pageInfo.hasPreviousPage).toBe(true);
        expect(result.pageInfo.hasNextPage).toBe(true);

        // Back to first page
        result = await findPaginated(collection, {
            last: 3,
            before: result.pageInfo.startCursor,
            sort,
        });

        expect(result.edges).toHaveLength(3);
        expect(result.edges[0]).toMatchObject({ node: { createdAt: "2020-03-20", color: "green", _id: new ObjectId(1) } }); // prettier-ignore
        expect(result.edges[1]).toMatchObject({ node: { createdAt: "2020-03-21", color: "green", _id: new ObjectId(2) } }); // prettier-ignore
        expect(result.edges[2]).toMatchObject({ node: { createdAt: "2020-03-22", color: "green", _id: new ObjectId(3) } }); // prettier-ignore
        expect(result.pageInfo.hasPreviousPage).toBe(false);
        expect(result.pageInfo.hasNextPage).toBe(true);
    });

    it("uses `_id` as tie-breaker when there are duplicated values on sorted field", async () => {
        const documents: TestDocumentB[] = [
            { _id: new ObjectId(1), date: "2020-03-15" },
            { _id: new ObjectId(2), date: "2020-03-22" },
            { _id: new ObjectId(3), date: "2020-03-22" },
        ];

        const collection = await sandbox.seedCollection(documents);

        let result: FindPaginatedResult<TestDocumentB>;

        // First page
        result = await findPaginated(collection, {
            first: 2,
            sort: { date: 1 },
        });

        expect(result.edges[0]).toMatchObject({ node: { _id: new ObjectId(1), date: "2020-03-15" } }); // prettier-ignore
        expect(result.edges[1]).toMatchObject({ node: { _id: new ObjectId(2), date: "2020-03-22" } }); // prettier-ignore

        // Second page
        result = await findPaginated(collection, {
            first: 2,
            after: result.pageInfo.endCursor,
            sort: { date: 1 },
        });

        expect(result.edges[0]).toMatchObject({ node: { _id: new ObjectId(3), date: "2020-03-22" } }); // prettier-ignore

        // Back to first page
        result = await findPaginated(collection, {
            last: 2,
            before: result.pageInfo.startCursor,
            sort: { date: 1 },
        });

        expect(result.edges[0]).toMatchObject({ node: { _id: new ObjectId(1), date: "2020-03-15" } }); // prettier-ignore
        expect(result.edges[1]).toMatchObject({ node: { _id: new ObjectId(2), date: "2020-03-22" } }); // prettier-ignore
    });

    it("filters results with the given `query`", async () => {
        const documents: TestDocumentC[] = [
            { _id: new ObjectId(1), code: 1, color: "blue" },
            { _id: new ObjectId(2), code: 2 },
            { _id: new ObjectId(3), code: 3 },
            { _id: new ObjectId(4), code: 4, color: "blue" },
            { _id: new ObjectId(5), code: 5 },
            { _id: new ObjectId(6), code: 6 },
            { _id: new ObjectId(7), code: 7, color: "blue" },
            { _id: new ObjectId(8), code: 8 },
        ];

        const collection = await sandbox.seedCollection(documents);

        const result = await findPaginated(collection, {
            first: 4,
            filter: { color: "blue" },
        });

        expect(result.edges).toHaveLength(3);
        expect(result.edges[0]).toMatchObject({ node: { code: 1, color: "blue" } });
        expect(result.edges[1]).toMatchObject({ node: { code: 4, color: "blue" } });
        expect(result.edges[2]).toMatchObject({ node: { code: 7, color: "blue" } });
        expect(result.pageInfo.hasPreviousPage).toBe(false);
        expect(result.pageInfo.hasNextPage).toBe(false);
    });

    it("limits fields according to the given `projection`", async () => {
        const documents: TestDocumentC[] = [
            { _id: new ObjectId(1), code: 1, color: "blue" },
            { _id: new ObjectId(2), code: 2 },
            { _id: new ObjectId(3), code: 3 },
        ];

        const collection = await sandbox.seedCollection(documents);

        const result = await findPaginated(collection, {
            projection: { _id: 1 },
        });

        expect(result.edges).toHaveLength(3);
        expect(result.edges[0]).not.toHaveProperty("node.color");
    });

    it("behaves well when there are no results", async () => {
        const documents: TestDocumentC[] = [
            { _id: new ObjectId(1), code: 1 },
            { _id: new ObjectId(2), code: 2 },
            { _id: new ObjectId(3), code: 3 },
        ];

        const collection = await sandbox.seedCollection(documents);

        const result = await findPaginated(collection, {
            filter: { nonExistentField: true },
        });

        expect(result.edges).toHaveLength(0);
        expect(result.pageInfo).toEqual({
            startCursor: null,
            endCursor: null,
            hasPreviousPage: false,
            hasNextPage: false,
        });
    });

    it("allows the use of dot notation in `sort`", async () => {
        const documents: TestDocumentD[] = [
            { _id: new ObjectId(1), info: { code: 2 } },
            { _id: new ObjectId(2), info: { code: 1 } },
            { _id: new ObjectId(3), info: { code: 3 } },
        ];

        const collection = await sandbox.seedCollection(documents);

        const result = await findPaginated(collection, {
            sort: { "info.code": 1 },
        });

        expect(result.edges).toHaveLength(3);
        expect(result.edges[0]).toMatchObject({ node: { info: { code: 1 } } });
        expect(result.edges[1]).toMatchObject({ node: { info: { code: 2 } } });
        expect(result.edges[2]).toMatchObject({ node: { info: { code: 3 } } });
    });
});
