import logger from "../../logger.js";
import lists from "./filter-lists.json" with {type: 'json'};

/**
 * Checks if words or phrases from the given text are included in any of the lists.
 *
 * @param {string} text - The text to check for words or phrases.
 * @return {Object|boolean} - An object with list names as keys and arrays of found words/phrases as values, or false if nothing is found.
 */
async function checkWord(text) {
  const foundWords = new Map();
  /*const { colorMapping } = await import(
    encodeURIComponent(
      "https://www.hamichlol.org.il/w/index.php?title=מדיה_ויקי:Gadget-checkWords.json&action=raw",
      { with: { type: "json" } }
    )
  );*/
  Object.entries(lists.wordesOfFilter).forEach(([listName, words]) => {
    words.forEach((word) => {
      const regex = new RegExp(word, "gi");
      const matches = Array.from(text.matchAll(regex));
      if (matches.length > 0) {
        if (!foundWords.has(listName)) {
          foundWords.set(listName, []);
        }
        foundWords.get(listName).push({
          expression: regex,
          matched: matches[0][0],
          input: text.substring(matches[0].index - 15, matches[0].index + 10),
          count: matches.length,
        });
      }
    });
  });

  /*Object.entries(colorMapping).forEach(([name, list]) => {
    const words = list.regexs;
    words.forEach((word) => {
      const regex = new RegExp(word.pattern, "gi");
      const matches = Array.from(text.matchAll(regex));
      if (matches.length > 0) {
        if (!foundWords[name]) {
          foundWords[name] = [];
        }
        foundWords[name].push({
          expression: regex,
          matched: matches[0][0],
          input: text.substring(matches[0].index - 15, matches[0].index + 10),
          count: matches.length,
        });
      }
    });
  });*/
  if(foundWords.size > 0) {
    logger.info("Found words:", {service: "filter", foundWords: Object.fromEntries(foundWords)});
  }

  return foundWords.size > 0 ? Object.fromEntries(foundWords) : false;
}

export default checkWord;
