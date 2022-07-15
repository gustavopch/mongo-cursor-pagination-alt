import * as base64Url from "base64-url";
import { EJSON } from "bson";
import { mapValues, get } from "lodash";
import { BaseDocument, CursorObject, Query, Sort } from "./types";
import { SortDirection } from "mongodb";

export const buildCursor = <TDocument extends BaseDocument>(document: TDocument, sort: Sort): CursorObject =>
    Object.keys(sort).reduce((acc, key) => {
        acc[key] = get(document, key);
        return acc;
    }, {} as CursorObject);

export const encodeCursor = (cursorObject: CursorObject): string => base64Url.encode(EJSON.stringify(cursorObject));

export const decodeCursor = (cursorString: string): CursorObject =>
    EJSON.parse(base64Url.decode(cursorString)) as CursorObject;

export const buildQueryFromCursor = <T>(sort: Sort, cursor: CursorObject): Query => {
    // Consider the `cursor`:
    // { createdAt: '2020-03-22', color: 'blue', _id: 4 }
    //
    // And the `sort`:
    // { createdAt: 1, color: -1 }
    //
    // The following table represents our documents (already sorted):
    // ┌────────────┬───────┬─────┐
    // │  createdAt │ color │ _id │
    // ├────────────┼───────┼─────┤
    // │ 2020-03-20 │ green │   1 │ <--- Line 1
    // │ 2020-03-21 │ green │   2 │ <--- Line 2
    // │ 2020-03-22 │ green │   3 │ <--- Line 3
    // │ 2020-03-22 │ blue  │   4 │ <--- Line 4 (our cursor points to here)
    // │ 2020-03-22 │ blue  │   5 │ <--- Line 5
    // │ 2020-03-22 │ amber │   6 │ <--- Line 6
    // │ 2020-03-23 │ green │   7 │ <--- Line 7
    // │ 2020-03-23 │ green │   8 │ <--- Line 8
    // └────────────┴───────┴─────┘
    //
    // In that case, in order to get documents starting after our cursor, we need
    // to make sure any of the following clauses is true:
    // - { createdAt: { $gt: '2020-03-22' } }                                          <--- Lines: 7 and 8
    // - { createdAt: { $eq: '2020-03-22' }, color: { $lt: 'blue' } }                  <--- Lines: 6
    // - { createdAt: { $eq: '2020-03-22' }, color: { $eq: 'blue' }, _id: { $gt: 4 } } <--- Lines: 5
    const cursorEntries = Object.entries(cursor);

    // So here we build an array of the OR clauses as mentioned above
    const clauses = cursorEntries.reduce((reducedClauses, [outerKey], index) => {
        const currentCursorEntries = cursorEntries.slice(0, index + 1);

        const clause = currentCursorEntries.reduce((reducingClause, [key, value]) => {
            // Last item in the clause uses an inequality operator
            if (key === outerKey) {
                const sortOrder = sort[key] ?? 1;
                const operator = sortOrder < 0 ? "$lt" : "$gt";
                reducingClause[key] = { [operator]: value };
                return reducingClause;
            }

            // The rest use the equality operator
            reducingClause[key] = { $eq: value };
            return reducingClause;
        }, {} as Query);

        reducedClauses.push(clause);
        return reducedClauses;
    }, [] as Query[]);

    return { $or: clauses };
};

export const normalizeDirectionParams = ({
    first,
    after,
    last,
    before,
    sort = {},
}: {
    first?: number | null;
    after?: string | null;
    last?: number | null;
    before?: string | null;
    sort?: Sort;
}) => {
    // In case our sort object doesn't contain the `_id`, we need to add it
    if (!("_id" in sort)) {
        // tslint:disable-next-line
        sort = {
            ...sort,
            // Important that it's the last key of the object to take the least priority
            _id: 1,
        };
    }

    if (last != null) {
        // Paginating backwards
        return {
            limit: Math.max(1, last ?? 20),
            cursor: before ? decodeCursor(before) : null,
            sort: mapValues(
                sort,
                (value): SortDirection => {
                    switch (value) {
                        case 1:
                        case "asc":
                        case "ascending":
                        default:
                            return -1;
                        case -1:
                        case "desc":
                        case "descending":
                            return 1;
                    }
                }
            ),
            paginatingBackwards: true,
        };
    }

    // Paginating forwards
    return {
        limit: Math.max(1, first ?? 20),
        cursor: after ? decodeCursor(after) : null,
        sort,
        paginatingBackwards: false,
    };
};
