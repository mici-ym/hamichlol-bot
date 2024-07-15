import lists from "./check/listes.json" with {type: 'json'};
import getProperties from "../import/utils.js";


export function botText(data, classification) {
  const parsedText = data.wikitext["*"];
  let text;

  if (data.sections.length < 2) {
    text = parsedText.split("\n\n")[0];
  } else {
    text = parsedText.split(/==.+==/)[0];
  }
  text = removePhotos(text);
  text = defaultsortAndCategories(text, data);
  text = text += `\n{{בוט ${classification}}}`;
  return text;
}

function removePhotos(text) {
  const regex1 = /(?<!סמל ?= ?)\[\[קובץ:.+\]\]\n?/g;
  const regex2 = /\|\s?תמונה\s?=[^{}\n|]*\n?/g;
  let textWithoutImages = text.replace(regex1, "").replace(regex2, "");
  return textWithoutImages;
}

function defaultsortAndCategories(text, data) {
  const defaultsort = getProperties(data, "defaultsort");
  if (defaultsort) text += `\n{{מיון רגיל:${defaultsort}}}`;
  const categoryRegex = /\[\[קטגוריה:(.+)\]\]/g;
  const categories = data.wikitext["*"].match(categoryRegex);
  if (categories && categories.length > 0) text += `\n${categories.join("\n") || ""}`;
  return text;
}


/**
 * Checks if a given text contains any words from a predefined list of words related to sports.
 * @param {string} text - The text to be checked for sports-related words.
 * @returns {(string|Array|boolean)} - The found word(s) if there is only one or two matches, false otherwise.
 */
export function checkBot(text) {
  const wordesOfBots = lists.wordesOfBots;
  const foundWords = [];

  for (let listName in wordesOfBots) {
    wordesOfBots[listName].forEach((word) => {
      if (text.includes(word)) {
        foundWords.push(wordesOfBots[listName]);
      }
    });
  }

  if (foundWords.length === 1) {
    return foundWords[0];
  } else if (foundWords.length === 2) {
    return foundWords;
  } else {
    return false;
  }
}
