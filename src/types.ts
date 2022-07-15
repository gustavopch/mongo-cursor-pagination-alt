import { ObjectId } from "bson";
import { SortDirection } from "mongodb";

export interface BaseDocument {
    _id: ObjectId;
}

export interface CursorObject {
    [key: string]: any;
}

export interface Query {
    [key: string]: any;
}

export interface Sort {
    [key: string]: SortDirection;
}

export interface Projection {
    [key: string]: any;
}
