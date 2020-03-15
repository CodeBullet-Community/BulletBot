/**
 * A number that represents a permission level
 *
 * @export
 * @enum {number}
 */
export type PermLevel = 0 | 1 | 2 | 3 | 4;

/**
 * All permission levels mapped to their number
 *
 * @export
 * @enum {number}
 */
export enum PermLevels {
    member = 0,
    immune = 1,
    mod = 2,
    admin = 3,
    botMaster = 4,
}