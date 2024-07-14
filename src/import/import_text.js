//import getRequestsInstance  from "..requests/requests.js";
import { requests } from "../requests/requests.js";
import checkWord from "./check/filter.js";
import getProperties from "../import/utils.js";
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
      prop: "templates|images|wikitext|sections",
    });

    const sinun = checkWord(parse.wikitext["*"]);
    if (sinun) {
      logger.info(`sinun ${title}`, { service: "filter", ...sinun});
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

