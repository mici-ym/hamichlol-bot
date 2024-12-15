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
  if (Array.isArray(obj2)) {
    obj2 = mapIdsToNames(obj2, "pageid");
  }

  const merged = {};

  const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

  for (const key of keys) {
    const val1 = obj1[key];
    const val2 = obj2[key];

    if (val1 !== undefined && val2 !== undefined) {
      if (Array.isArray(val1) && Array.isArray(val2)) {
        merged[key] = [...val1, ...val2];
      } else if (
        typeof val1 === "object" && val1 !== null &&
        typeof val2 === "object" && val2 !== null
      ) {
        merged[key] = mergeDeep(val1, val2);
      } else {
        merged[key] = val1; // או val2 בהתאם לדרישות
      }
    } else if (val1 !== undefined) {
      merged[key] = val1;
    } else {
      merged[key] = val2;
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
 * Handles different structures of API responses including 'pages', 'querypage', and other formats.
 *
 * @param {Object|Array} existingResults - The current set of results to be merged with new data.
 * @param {Object} data - The new data object containing query results.
 * @param {Object} data.query - The query object within the new data.
 * @returns {Object|Array} The merged results.
 */
function mergeResults(existingResults, data) {
  if (!data.query) {
    return existingResults; // אם אין נתונים חדשים, החזר את התוצאות הקיימות
  }

  if ("pages" in data.query) {
    // מיזוג עמוק עבור תוצאות מסוג 'pages'
    return mergeDeep(existingResults, data.query.pages);
  } else if ("querypage" in data.query && Array.isArray(data.query.querypage.results)) {
    // טיפול במבנה החדש עם 'querypage'
    const newResults = data.query.querypage.results;
    if (Array.isArray(existingResults)) {
      // אם התוצאות הקיימות הן מערך, הוסף את התוצאות החדשות
      return [...existingResults, ...newResults];
    } else if (typeof existingResults === 'object' && existingResults !== null) {
      // אם התוצאות הקיימות הן אובייקט, בצע מיזוג עמוק
      return mergeDeep(existingResults, { results: newResults });
    } else {
      // אם אין תוצאות קיימות או שהן מסוג לא צפוי, החזר את התוצאות החדשות
      return newResults;
    }
  } else {
    // טיפול במקרים אחרים
    if (Array.isArray(existingResults)) {
      return existingResults.concat(...Object.values(data.query));
    } else if (typeof existingResults === 'object' && existingResults !== null) {
      // ביצוע מיזוג עמוק אם שני הערכים הם אובייקטים
      return mergeDeep(existingResults, data.query);
    } else {
      // אם אין תוצאות קיימות או שהן מסוג לא צפוי, החזר את התוצאות החדשות
      return data.query;
    }
  }
}


export { mapIdsToNames, mergeResults };
