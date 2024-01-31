import requests from "./requests.js";
import checkWord from "./filter.js";

/**
 * Imports text from a Wikipedia page and performs some operations on it.
 * @param {string} title - The title of the Wikipedia page to import text from.
 * @returns {Promise<{text: string, summary: string}>} - A promise that resolves to an object containing the modified text and the update summary.
 */
export async function importText(title) {
  try {
    const request = new requests("https://he.wikipedia.org/w/api.php");
    const data = await request.parse({ page: title });

    const sinun = checkWord(data.parse.text["*"]);
    if (sinun) {
      console.error(title + "- sinun");
      return sinun;
    }

    const parit = getProperties(data);
    const girsa = data.parse.revid;
    const SortingWikipedia = `{{מיון ויקיפדיה|דף=${title}|גרסה=${girsa}|פריט=${parit}}}`;

    const text = `${data.parse.text["*"]}\n{{וח|${title}}}\n${SortingWikipedia}`;
    const summary = `עדכון מוויקיפדיה גרסה ${girsa}`;
    return { text, summary };
  } catch (error) {
    console.error(error);
    throw error;
  }
}

/**
 * Retrieves the value of the "wikibase_item" property from the given data object.
 * If the property does not exist, an empty string is returned.
 * @param {object} data - The input data object containing the properties to be checked.
 * @returns {string} - The value of the "wikibase_item" property, or an empty string if it doesn't exist.
 */
function getProperties(data) {
  let parit = "";

  if (data.parse.properties && data.parse.properties?.length > 0) {
    for (let property of data.parse.properties) {
      if (property.name === "wikibase_item") {
        parit = property["*"];
        break;
      }
    }
  }

  return parit;
}
