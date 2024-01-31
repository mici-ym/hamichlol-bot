import listes from "./liste's.js";

class fiter_edit {
  /**
   *
   * @param {string} text
   * @returns {boolean}
   */
  checkWords(text) {
    for (const i in listes.wordesOfFilterSport) {
      if (listes.wordesOfFilterSport[i].test(text)) {
        return listes.wordesOfFilterSport[i];
      }
    }
    return false;
  }

  /**
   *
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  checkCategories(text) {
    const chess = /שחמט/.test(text);
    if (chess) {
      return false;
    } else {
      const sport = listes.wordesOfSport.test(text);
      if (sport) {
        return true;
      } else {
        return false;
      }
    }
  }
}

export default fiter_edit;
