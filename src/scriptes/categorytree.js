import { requests } from "../requests/requests.js";
import fs from "fs";

class CategoryTree extends requests {
  constructor(wikiUrl) {
    super(wikiUrl);
  }
  pages = false;
  conditionForCategory = true;
  conditionForThePage = true;
  list = [];
  categorys = [];
  categoryIds = [];

  /**
   * Creates a category tree.
   * @param {Object} options - The options for creating the category tree.
   * @param {string} options.categoryId - The ID of the category.
   * @param {string} options.categoryName - The name of the category.
   * @param {boolean} [options.pages=false] - Indicates whether to fetch pages or not.
  * @param {boolean} [options.conditionForThePage=true] - Indicates whether to fetch 
  * @param {boolean} [options.withCookie=true] - Indicates whether to use cookies.
   * @param {string} [options.saveToFile=false] - Indicates whether to save to a file or not.
   * @returns {Promise<Array>} - An array containing the list of pages and categories.
   */
  async createCategoryTree({
    categoryId,
    categoryName,
    pages = false,
    conditionForThePage,
    conditionForCategory,
    withCookie = true,
    saveToFile: File = false,
  }) {
    if (pages) this.pages = true;
    if (conditionForThePage) this.conditionForThePage = conditionForThePage;
    if (conditionForCategory) this.conditionForCategory = conditionForCategory;
    if (categoryId) {
      await this.createList({ categoryId, withCookie });
    } else if (categoryName) {
      await this.createList({ categoryName, withCookie });
    }

    for (let i = 0; i < this.categoryIds.length; i++) {
      const categoryId = this.categoryIds[i];
      const delay = this.getDelay(i);
      await this.delayPromise(delay);
      await this.createList({ categoryId });
      console.log(
        `${i + 1}/${this.categoryIds.length}, ${
          ((i + 1) / this.categoryIds.length) * 100
        }%`
      );
    }

    if (File) {
      if (pages) {
        await this.saveToFile(this.list, `${categoryName}_pages.txt`).catch(
          console.error
        );
      }
      await this.saveToFile(
        this.categorys,
        `${categoryName}_categorys.txt`
      ).catch(console.error);
    }

    return [this.list, this.categorys];
  }

  /**
   * Creates a list of pages and categories.
   * @param {Object} options - The options for creating the list.
   * @param {string} [options.categoryName] - The name of the category.
   * @param {string} [options.categoryId] - The ID of the category.
   * @throws {Error} - If neither categoryName nor categoryId is provided.
   * @returns {Promise<string>} - A string indicating the completion of the operation.
   */
  async createList({ categoryName, categoryId, withCookie = true }) {
    if (!categoryName && !categoryId) {
      throw new Error("You must provide either categoryId or categoryName");
    }

    const options = {
      cmtype: this.pages ? undefined : "subcat",
      cmnamespace: "0|14",
    };

    const data = categoryName
      ? await this.categoryMembers({ categoryName, withCookie, options })
      : await this.categoryMembers({ categoryId, withCookie, options });

    for (const page of data) {
      if (
        page.ns === 14 &&
        !this.categoryIds.includes(page.pageid) &&
        (typeof this.conditionForCategory === "boolean" ||
          this.conditionForCategory(page.title))
      ) {
        this.categoryIds.push(page.pageid);
        this.categorys.push(page.title);
      } else if (
        page.ns === 0 &&
        !this.list.includes(page.title) &&
        (typeof this.conditionForThePage === "boolean" ||
          this.conditionForThePage(page.title))
      ) {
        this.list.push(page.title);
      }
    }

    return "done";
  }

  /**
   * Calculates the delay based on the index provided.
   * @param {number} index - The current index in the iteration.
   * @returns {number} - The delay in milliseconds.
   */
  getDelay(index) {
    const delays = [0, 500, 1000, 1500];
    const delayIndex = Math.floor(index / 10) % delays.length;
    return delays[delayIndex];
  }
  /**
   * Returns a promise that resolves after a specified delay.
   * @param {number} delay - The delay in milliseconds.
   * @returns {Promise} - A promise that resolves after the delay.
   */
  delayPromise(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Saves the provided array to a file.
   * @param {Array} arr - The array to save to the file.
   * @param {string} filename - The name of the file to save the array to.
   */
  async saveToFile(arr, filename) {
    try {
      fs.writeFileSync(filename, arr.join("\n"));
    } catch (err) {
      console.error(err);
    }
  }
}
export default CategoryTree;
