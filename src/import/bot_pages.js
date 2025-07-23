import lists from "./check/listes.json" with {type: 'json'};

export default async function botPages() {
  return await import(
    encodeURIComponent(
      "https://www.hamichlol.org.il/w/index.php?title=%D7%9E%D7%93%D7%99%D7%94_%D7%95%D7%99%D7%A7%D7%99:Gadget-mw-import-tionary.js&action=raw&ctype=text/javascript"
    )
  );
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
