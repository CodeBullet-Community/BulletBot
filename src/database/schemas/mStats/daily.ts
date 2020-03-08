import { MStatsObject, mStatsSchemaDefinition } from "./_mStats";
import { ExDocument } from "../global";
import _ from "lodash";
import { Schema } from "mongoose";

/**
 * Raw MStatsDay that saves statistics of a day
 */
export interface MStatsDayObject extends MStatsObject {
    day: number;
}
/**
 * Mongoose Document for MStatsDayObject
 */
export type MStatsDayDoc = ExDocument<MStatsDayObject>;
var mStatsDaySchemaDefinition: any = _.cloneDeep(mStatsSchemaDefinition);
mStatsDaySchemaDefinition.day = Number;
/**
 * Schema for MStatsDayObject
 */
export const mStatsDaySchema = new Schema(mStatsDaySchemaDefinition, { collection: 'daily' });