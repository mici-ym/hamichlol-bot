 import lists from "./listes.json" with {type: 'json'};

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
          expression: regex, 
          matched: matches[0][0],
          input: text.substring(matches[0].index - 15, matches[0].index + 10),
          count: matches.length 
        });
      }
    });
  });
 
  return Object.keys(foundWords).length > 0 ? foundWords : false;
}

export default checkWord;