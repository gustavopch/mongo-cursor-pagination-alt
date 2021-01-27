import { ObjectId } from "bson";

export type BaseDocument = {
    _id: ObjectId;
};

export type CursorObject = {
    [key: string]: any;
};

export type Query = {
    [key: string]: any;
};

export type Sort = {
    [key: string]: number;
};

export type Projection = {
    [key: string]: any;
};
