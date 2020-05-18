/**
 * Defines any constructor of class Class
 * 
 * @template Class 
 */
type Constructor<Class> = new (...args: any[]) => Class;

/**
 * Removes the first element of a tuple type
 * 
 * @template Tuple 
 */
type RemoveFirstFromTuple<Tuple extends any[]> =
    Tuple['length'] extends 0 ? undefined :
    (((...b: Tuple) => void) extends (a, ...b: infer I) => void ? I : []);

/**
* A key of an Object
*/
type ObjectKey = string | number | symbol;

/**
 * Array of keys of a specific Object
 */
type Keys<T> = (keyof T)[];