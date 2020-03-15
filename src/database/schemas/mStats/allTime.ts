import { MStatsObject, mStatsSchemaDefinition } from "./_mStats";
import { ExDocument } from "../global";
import _ from "lodash";
import { Schema } from "mongoose";

/**
 * Raw MStatsAllTime that saves all statistics together
 */
export interface MStatsAllTimeObject extends MStatsObject {
    from: number;
    to: number;
}
/**
 * Mongoose Document for MStatsAllTimeObject
 */
export type MStatsAllTimeDoc = ExDocument<MStatsAllTimeObject>;
let mStatsAllTimeSchemaDefinition: any = _.cloneDeep(mStatsSchemaDefinition);
mStatsAllTimeSchemaDefinition.from = Number;
mStatsAllTimeSchemaDefinition.to = Number;
/**
 * Schema for MStatsAllTimeObject
 */
export const mStatsAllTimeSchema = new Schema(mStatsAllTimeSchemaDefinition, { collection: 'allTime' });