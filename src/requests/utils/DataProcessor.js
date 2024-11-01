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
  if (Array.isArray(obj2)) {
    obj2 = mapIdsToNames(obj2, "pageid");
  }
  // Loop through each key in obj1
  for (const key in obj1) {
    // Check if the key exists in obj2
    if (obj2.hasOwnProperty(key)) {
      // If both values are arrays, merge them
      if (
        Array.isArray(obj1[key]) &&
        obj1[key] !== null &&
        Array.isArray(obj2[key]) &&
        obj2[key] !== null
      ) {
        merged[key] = [...obj1[key], ...obj2[key]];
      }
      // If both values are objects, merge them recursively
      else if (
        typeof obj1[key] === "object" &&
        obj1[key] !== null &&
        typeof obj2[key] === "object" &&
        obj2[key] !== null
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
    if (obj2.hasOwnProperty(key) && !merged.hasOwnProperty(key)) {
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
 * @param {string} key - The key in the original object's values that should be used as
 * @returns {Object} A new object where each key is the `title` from the original object's values, and the value is the original value from the input object.
 */
function mapIdsToNames(obj, key) {
  return Object.fromEntries(
    Object.entries(obj).map(([, value]) => [value[key], value])
  );
}

/**
 * Merges new query results with existing results.
 * If the query data contains 'pages', it performs a deep merge.
 * Otherwise, it concatenates the new results to the existing ones.
 *
 * @param {Object|Array} existingResults - The current set of results to be merged with new data.
 * @param {Object} data - The new data object containing query results.
 * @param {Object} data.query - The query object within the new data.
 * @returns {Object|Array} The merged results, either as a deeply merged object or a concatenated array.
 */
function mergeResults(existingResults, data) {
  if ("pages" in data.query) {
    // נניח שפונקציית mergeDeep כבר מוגדרת כדי למזג עמוק שני אובייקטים.
    return mergeDeep(existingResults, data.query.pages);
  } else {
    return existingResults.concat(...Object.values(data.query));
  }
}


export { mapIdsToNames, mergeResults };
