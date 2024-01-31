import { wordesOfFilter } from "./liste's.js";

/**
 * Checks if a word from the given text is included in any of the lists.
 *
 * @param {string} text - The text to check for words.
 * @return {Array<string>|boolean} - The name of the list if a word is found, or false if no word is found.
 */
function checkWord(text) {
  const foundWords = [];

  for (let listName in wordesOfFilter) {
    wordesOfFilter[listName].forEach((word) => {
      if (text.includes(word)) {
        foundWords.push(wordesOfFilter[listName], word);
      }
    });
  }

  return foundWords.length === 0 ? false : foundWords;
}

export default checkWord;
