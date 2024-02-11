//import getRequestsInstance  from "..requests/requests.js";
import { requests } from "../requests/requests.js";
import checkWord from "./check/filter.js";
import * as botPages from "./bot_pages.js";

/**
 * Imports text from a Wikipedia page and performs some operations on it.
 * @param {string} title - The title of the Wikipedia page to import text from.
 * @returns {Promise<{text: string, summary: string}>} - A promise that resolves to an object containing the modified text and the update summary.
 */
export async function importText(title, checkBot) {
  try {
    const request = new requests("https://he.wikipedia.org/w/api.php");
    //const request = getRequestsInstance("https://he.wikipedia.org/w/api.php", "wiki");
    const data = await request.parse({
      page: title,
      prop: "templates|images|wikitext",
    });

    const sinun = checkWord(data.parse.wikitext["*"]);
    if (sinun) {
      //console.error(title + "- sinun");
      //console.error(sinun);
      return sinun;
    }

    const parit = getProperties(data);
    const girsa = data.parse.revid;
    const SortingWikipedia = `{{מיון ויקיפדיה|דף=${title}|גרסה=${girsa}|פריט=${parit}}}`;

    let text = `${data.parse.text["*"]}\n{{וח|${title}}}\n${SortingWikipedia}`;
    let summary = `עדכון מוויקיפדיה גרסה ${girsa}`;
    if (checkBot) {
      const bot = botPages.checkBot(data.parse.text["*"]);
      if (bot) {
        text = `${botPages.botText(text)}\n{{בוט ${bot}}\n${SortingWikipedia}`;
        summary = `עדכון מוויקיפדיה גרסה ${girsa}, בוט ${bot}`;
      }
    }
    return { text, summary };
  } catch (error) {
    console.error(error);
    throw new Error(error);
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
