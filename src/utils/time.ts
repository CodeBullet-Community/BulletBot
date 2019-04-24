
/**
 * all durations in milliseconds
 *
 * @export
 * @enum {number}
 */
export enum durations {
    nano = 1e-6,
    second = 1000,
    minute = second * 60,
    hour = minute * 60,
    day = hour * 24,
    thirtyDays = day * 30
}

export const timeFormat = 'ddd dd/mm/yyyy HH:MM:ss';

/**
 * This function returns how many times a specified duration fits into a time frame.
 *
 * @param {number} timestamp0 first timestamp
 * @param {number} timestamp1 second timestamp
 * @param {(number | durations)} duration duration of time
 * @returns
 */
export function getDurationDiff(timestamp0: number, timestamp1: number, duration: number | durations) {
    return Math.abs(timestamp0 - timestamp1) / duration;
}

/**
 * This function gets the rounded day difference between two timestamps using getDurationDiff.
 *
 * @export
 * @param {number} timestamp0 first timestamp
 * @param {number} timestamp1 second timestamp
 * @returns
 */
export function getDayDiff(timestamp0: number, timestamp1: number) {
    return Math.round(getDurationDiff(timestamp0, timestamp1, durations.day));
}

/**
 * converts process.hrtime into an nano seconds
 *
 * @export
 * @returns
 */
export function toNano(time: [number, number]) {
    return (time[0] * 1e9 + time[1]) * durations.nano;
}