import { ObjectId } from "bson";

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
    [key: string]: number;
}

export interface Projection {
    [key: string]: any;
}
