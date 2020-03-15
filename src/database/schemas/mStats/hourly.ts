import { MStatsObject, mStatsSchemaDefinition } from "./_mStats";
import { ExDocument } from "../global";
import _ from "lodash";
import { Schema } from "mongoose";

/**
 * Raw MStatsDay that saves statistics of an hour
 */
export interface MStatsHourObject extends MStatsObject {
    day: number;
    hour: number;
}
/**
 * Mongoose Document for MStatsHourObject
 */
export type MStatsHourDoc = ExDocument<MStatsHourObject>;
var mStatsHourSchemaDefinition: any = _.cloneDeep(mStatsSchemaDefinition);
mStatsHourSchemaDefinition.day = Number;
mStatsHourSchemaDefinition.hour = Number;
/**
 * Schema for MStatsHourObject
 */
export const mStatsHourSchema = new Schema(mStatsHourSchemaDefinition, { collection: 'hourly' });