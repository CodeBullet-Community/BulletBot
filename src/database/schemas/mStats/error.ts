import { ExDocument } from "../global";
import { Schema } from "mongoose";

/**
 * Raw Error object from the database
 */
export interface ErrorObject {
    first: number;
    last: number;
    md5: string;
    count: number;
    error: any;
}
/**
 * Mongoose Document for ErrorObject
 */
export type ErrorDoc = ExDocument<ErrorObject>;
/**
 * Schema for ErrorObject
 */
export const errorSchema = new Schema({
    first: Number,
    last: Number,
    md5: String,
    count: Number,
    error: Schema.Types.Mixed
}, { collection: 'errors' });