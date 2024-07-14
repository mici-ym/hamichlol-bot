//import getRequestsInstance  from "..requests/requests.js";
import { requests } from "../requests/requests.js";
import checkWord from "./check/filter.js";
import * as botPages from "./bot_pages.js";
import logger from "../logger.js";

/**
 * Imports text from a Wikipedia page and performs some operations on it.
 * @param {string} title - The title of the Wikipedia page to import text from.
 * @returns {Promise<{text: string, summary: string}>} - A promise that resolves to an object containing the modified text and the update summary.
 */
export async function importText(title, { checkBot, bot }) {
  try {
    const request = new requests("https://he.wikipedia.org/w/api.php");
    //const request = getRequestsInstance("https://he.wikipedia.org/w/api.php", "wiki");
    const { parse } = await request.parse({
      page: title,
      prop: "templates|images|wikitext",
    });

    const sinun = checkWord(parse.wikitext["*"]);
    if (sinun) {
      logger.info(`sinun ${title}`, sinun);
      return sinun;
    }

    const dataPage = {
      דף: parse.title,
      גרסה: parse.revid,
      פריט: getProperties(parse, "wikibase_item"),
    };

    const Credit = `{{וח|${title}}}`;
    // Create the sorting template for Wikipedia
    let SortingWikipedia = `{{מיון ויקיפדיה`;
    Object.keys(dataPage).forEach((key) => {
      if (dataPage[key]) {
        SortingWikipedia += `|${key}=${dataPage[key]}`;
      }
    });
    SortingWikipedia += `}}`;
    let text = parse.wikitext["*"];
    const redirect = /#הפניה|#REDIRECT/.test(text);

    if (!redirect && !bot) {
      text += `\n${Credit}\n${SortingWikipedia}`;
    }
    if (checkBot) {
      bot = botPages.checkBot(parse.text["*"]);
    }
    if (bot) {
      text = `${botPages.botText(text)}\n{{בוט ${bot}}\n${SortingWikipedia}`;
    }
    let summary = `עדכון מוויקיפדיה גרסה ${dataPage["גרסה"]}`;
    if (bot) summary += `, בוט ${bot}`;

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
 * @param {string} type - The type of property to check for.
 * @returns {string} - The value of the "wikibase_item" property, or an empty string if it doesn't exist.
 */
function getProperties(parse, type) {
  // Check if properties exist and if the length is greater than 0
  if (!parse.properties || parse.properties.length < 1) return "";

  // Iterate over the properties
  for (const property of parse.properties) {
    // Check if the property name is "wikibase_item"
    if (property.name == type) {
      // Return the value of the property if found
      return property["*"];
    }
  }

  // Return an empty string if the wikibase item is not found
  return false;
}
