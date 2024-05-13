/* eslint-disable no-prototype-builtins */
function mergeDeep(obj1, obj2) {
  const merged = {};

  // עבור כל מפתח ב-obj1
  for (const key in obj1) {
    // אם המפתח קיים גם ב-obj2
    if (obj2.hasOwnProperty(key)) {
      // אם שני הערכים הם אובייקטים, ממשיכים למזג באופן רקורסיבי
      if (
        Array.isArray(obj1[key]) &&
        obj1[key] !== null &&
        Array.isArray(obj2[key]) &&
        obj2[key] !== null
      ) {
        // אחרת, שומרים את הערך מ-obj2
        merged[key] = [...obj1[key], ...obj2[key]];
      } else if (
        typeof obj1[key] === "object" &&
        obj1[key] !== null &&
        typeof obj2[key] === "object" &&
        obj2[key] !== null
      ) {
        merged[key] = mergeDeep(obj1[key], obj2[key]);
      } else {
        // אחרת, שומרים את הערך מ-obj1
        merged[key] = obj1[key];
      }
    } else {
      // המפתח לא קיים ב-obj2, שומרים את הערך מ-obj1
      merged[key] = obj1[key];
    }
  }

  // עבור כל מפתח ב-obj2 שלא כבר טופל
  for (const key in obj2) {
    if (obj2.hasOwnProperty(key) && !merged.hasOwnProperty(key)) {
      merged[key] = obj2[key];
    }
  }

  return merged;
}

function mapIdsToNames(obj) {
  const newObj = {};
  for (const key in obj) {
    newObj[obj[key].title] = obj[key];
  }
  return newObj;
}

export { mergeDeep, mapIdsToNames };
