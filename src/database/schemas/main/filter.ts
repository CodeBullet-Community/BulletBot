import { Snowflake } from "discord.js";
import { ExDocument } from "../global";
import { Schema } from "mongoose";

export interface FiltersObject {
    guild: Snowflake;
    filters: {
        // key is filter name
        [key: string]: {
            _enabled: boolean;
            [key: string]: any;
        }
    }
}
export type FiltersDoc = ExDocument<FiltersObject>;
export const filtersSchema = new Schema({
    guild: String,
    filters: Schema.Types.Mixed
}, { collection: 'filters' });