import { wordesOfBots } from "./liste's.js";

export function botText(text) {
  const regex1 = /==.*==/g;
  const regex2 = "\n\n";
  const regex3 = /\[\[קטגוריה:[^\]]\]\]/g;
  const regex4 = /{{מיון רגיל:.+}}/;
  let textList;
  let categoriesToAdd;
  let defaultsortToAdd;
  let newText;
  let first;
  textList = text.split(regex1);
  if (textList.length < 3) {
    textList = text.split(regex2);
    first = textList[0];
  } else {
    first = textList[0];
  }
  categoriesToAdd = text.match(regex3);
  defaultsortToAdd = text.match(regex4);
  if (defaultsortToAdd) {
    newText = `${first}\n${defaultsortToAdd.join()}\n${categoriesToAdd.join(
      "\n"
    )}`;
  } else {
    newText = `${first}\n${categoriesToAdd.join("\n")}`;
  }
  return removePhotos(newText);
}

/**
 *
 * @param {string} text
 * @returns {string}
 */
function removePhotos(text) {
  const regex1 = /(?<!סמל ?= ?)\[\[קובץ:.+\]\]\n?/g;
  const regex2 = /\|\s?תמונה[^|}]*\n/g;
  let textWithoutImages = text.replace(regex1, "").replace(regex2, "");
  return textWithoutImages;
}

/**
 * Checks if a given text contains any words from a predefined list of words related to sports.
 * @param {string} text - The text to be checked for sports-related words.
 * @returns {(string|Array|boolean)} - The found word(s) if there is only one or two matches, false otherwise.
 */
export function checkBot(text) {
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
