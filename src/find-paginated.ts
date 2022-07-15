import { Collection, Filter } from "mongodb";

import { BaseDocument, Projection, Sort } from "./types";
import { buildCursor, buildQueryFromCursor, encodeCursor, normalizeDirectionParams } from "./utils";

export interface FindPaginatedParams<TDocument> {
    first?: number | null;
    after?: string | null;
    last?: number | null;
    before?: string | null;
    filter?: Filter<TDocument>;
    sort?: Sort;
    projection?: Projection;
}

export interface FindPaginatedResult<TDocument> {
    edges: Array<{ cursor: string; node: TDocument }>;
    pageInfo: {
        startCursor: string | null;
        endCursor: string | null;
        hasPreviousPage: boolean;
        hasNextPage: boolean;
    };
}

export const findPaginated = async <TDocument extends BaseDocument>(
    collection: Collection<TDocument>,
    {
        first,
        after,
        last,
        before,
        filter = {},
        sort: originalSort = {},
        projection = {},
    }: FindPaginatedParams<TDocument>
): Promise<FindPaginatedResult<TDocument>> => {
    const { limit, cursor, sort, paginatingBackwards } = normalizeDirectionParams({
        first,
        after,
        last,
        before,
        sort: originalSort,
    });

    let findFilter: Filter<TDocument> = filter;
    if (cursor) {
        findFilter = <Filter<TDocument>>{
            $and: [filter, buildQueryFromCursor(sort, cursor)],
        };
    }

    const allDocuments = await collection
        .find<TDocument>(findFilter, {})
        .sort(sort)
        // Get 1 extra document to know if there's more after what was requested
        .limit(limit + 1)
        .project<TDocument>(projection)
        .toArray();

    // Check whether the extra document mentioned above exists
    const extraDocument = allDocuments[limit];
    const hasMore = Boolean(extraDocument);

    // Build an array without the extra document
    const desiredDocuments = allDocuments.slice(0, limit);
    if (paginatingBackwards) {
        desiredDocuments.reverse();
    }

    const edges = desiredDocuments.map((document) => ({
        cursor: encodeCursor(buildCursor(document, sort)),
        node: document,
    }));

    return {
        edges,
        pageInfo: {
            startCursor: edges[0]?.cursor ?? null,
            endCursor: edges[edges.length - 1]?.cursor ?? null,
            hasPreviousPage: paginatingBackwards ? hasMore : Boolean(after),
            hasNextPage: paginatingBackwards ? Boolean(before) : hasMore,
        },
    };
};
