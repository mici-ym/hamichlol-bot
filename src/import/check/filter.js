import lists from "./liste's.json";

/**
 * Checks if words or phrases from the given text are included in any of the lists.
 *
 * @param {string} text - The text to check for words or phrases.
 * @return {Object|boolean} - An object with list names as keys and arrays of found words/phrases as values, or false if nothing is found.
 */
function checkWord(text) {
  const foundWords = {};

  Object.entries(lists.wordesOfFilter).forEach(([listName, words]) => {
    words.forEach(word => {
      const regex = new RegExp(word, 'gi');
      const matches = Array.from(text.matchAll(regex));
      if (matches.length > 0) {
        if (!foundWords[listName]) {
          foundWords[listName] = [];
        }
        foundWords[listName].push({ 
          expression: word, 
          matched: matches[0][0], 
          count: matches.length 
        });
      }
    });
  });

  return Object.keys(foundWords).length > 0 ? foundWords : false;
}

export default checkWord;