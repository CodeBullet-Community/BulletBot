
/**
 * all durations in milliseconds
 *
 * @export
 * @enum {number}
 */
export enum Durations {
    nano = 1e-6,
    second = 1000,
    minute = second * 60,
    hour = minute * 60,
    day = hour * 24,
    thirtyDays = day * 30
}

export type BenchmarkTimestamp = [number, number];

export const timeFormat = 'ddd dd/mm/yyyy HH:MM:ss';

/**
 * This function returns how many times a specified duration fits into a time frame.
 *
 * @param {number} timestamp0 first timestamp
 * @param {number} timestamp1 second timestamp
 * @param {(number | Durations)} duration duration of time
 * @returns
 */
export function getDurationDiff(timestamp0: number, timestamp1: number, duration: number | Durations) {
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
    return Math.round(getDurationDiff(timestamp0, timestamp1, Durations.day));
}

/**
 * calculates time difference between two dates in days, hours, minutes, seconds, milliseconds
 *
 * @export
 * @param {number} msDuration duration in milliseconds
 * @returns
 */
export function getDistributedDuration(msDuration: number) {
    msDuration = Math.abs(msDuration);
    let days = Math.floor(msDuration / Durations.day);
    let hours = Math.floor(msDuration / Durations.hour) % 24;
    let minutes = Math.floor(msDuration / Durations.minute) % 60;
    let seconds = Math.floor(msDuration / Durations.second) % 60;
    let milliseconds = msDuration % 1000;
    return { days, hours, minutes, seconds, milliseconds };
}

/**
 * converts process.hrtime into an nano seconds
 *
 * @export
 * @returns
 */
export function toNano(time: BenchmarkTimestamp) {
    return (time[0] * 1e9 + time[1]) * Durations.nano;
}