/* eslint-disable no-prototype-builtins */
/**
 * A function to merge two JavaScript objects deeply.
 * If both objects have the same key and the value of the key is an array, it will merge the arrays.
 * If both objects have the same key and the value of the key is an object, it will merge the objects recursively.
 * If a key exists in obj1 but not in obj2, it will keep the value from obj1.
 * If a key exists in obj2 but not in obj1, it will keep the value from obj2.
 *
 * @param {Object} obj1 - The first object to merge.
 * @param {Object} obj2 - The second object to merge.
 * @returns {Object} - The merged object.
 */
function mergeDeep(obj1, obj2) {
  const merged = {};

  // Loop through each key in obj1
  for (const key in obj1) {
    // Check if the key exists in obj2
    if (obj2.hasOwnProperty(key)) {
      // If both values are arrays, merge them
      if (
        Array.isArray(obj1[key]) &&
        obj1[key]!== null &&
        Array.isArray(obj2[key]) &&
        obj2[key]!== null
      ) {
        merged[key] = [...obj1[key],...obj2[key]];
      } 
      // If both values are objects, merge them recursively
      else if (
        typeof obj1[key] === "object" &&
        obj1[key]!== null &&
        typeof obj2[key] === "object" &&
        obj2[key]!== null
      ) {
        merged[key] = mergeDeep(obj1[key], obj2[key]);
      } 
      // If the values are not objects or arrays, keep the value from obj1
      else {
        merged[key] = obj1[key];
      }
    } 
    // If the key does not exist in obj2, keep the value from obj1
    else {
      merged[key] = obj1[key];
    }
  }

  // Loop through each key in obj2 that is not already handled
  for (const key in obj2) {
    if (obj2.hasOwnProperty(key) &&!merged.hasOwnProperty(key)) {
      merged[key] = obj2[key];
    }
  }

  return merged;
}

/**
 * Transforms an object into a new object where the keys are the `title` property of the original values.
 * This function assumes that each value in the original object has a `title` property.
 * It is useful for converting arrays of objects into a keyed object, where each key corresponds to a unique identifier like a title.
 *
 * @param {Object<object>} obj - The original object to transform. The values of this object should be objects themselves, each containing a `title` property.
 * @returns {Object} A new object where each key is the `title` from the original object's values, and the value is the original value from the input object.
 */
function mapIdsToNames(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([, value]) => [value.title, value])
  );
}

export { mergeDeep, mapIdsToNames };
