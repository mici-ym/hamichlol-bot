import requests from "./requests.js";
import fs from "fs";

class CategoryTree extends requests {
  constructor(wikiUrl) {
    super(wikiUrl);
  }
  pages = false;
  list = [];
  categorys = [];
  categoryIds = [];

  /**
   * Creates a category tree.
   * @param {Object} options - The options for creating the category tree.
   * @param {string} options.categoryId - The ID of the category.
   * @param {string} options.categoryName - The name of the category.
   * @param {boolean} [options.pages=false] - Indicates whether to fetch pages or not.
   * @param {boolean} [options.withCookie=true] - Indicates whether to use cookies.
   * @param {string} [options.saveToFile=false] - Indicates whether to save to a file or not.
   * @returns {Array} - An array containing the list of pages and categories.
   */
  async createCategoryTree({
    categoryId,
    categoryName,
    pages = false,
    withCookie = true,
    saveToFile: File = false,
  }) {
    const list = [];
    const categorys = [];
    const categoryIds = [];

    if (categoryId) {
      await this.createList({ categoryId, withCookie });
    } else if (categoryName) {
      await this.createList({ categoryName, withCookie });
    }

    for (let i = 0; i < categoryIds.length; i++) {
      const categoryId = categoryIds[i];
      const delay = this.getDelay(i);
      await this.delayPromise(delay);
      await this.createList({ categoryId });
      console.log(
        `${i + 1}/${categoryIds.length}, ${
          ((i + 1) / categoryIds.length) * 100
        }%`
      );
    }

    if (File) {
      if (pages) {
        await this.saveToFile(list, `${categoryName}_pages.txt`).catch(
          console.error
        );
      }
      await this.saveToFile(categorys, `${categoryName}_categorys.txt`).catch(
        console.error
      );
    }

    return [list, categorys];
  }

  /**
   * Creates a list of pages and categories.
   * @param {Object} options - The options for creating the list.
   * @param {string} [options.categoryName] - The name of the category.
   * @param {string} [options.categoryId] - The ID of the category.
   * @throws {Error} - If neither categoryName nor categoryId is provided.
   * @returns {string} - A string indicating the completion of the operation.
   */
  async createList({ categoryName, categoryId }) {
    if (!categoryName && !categoryId) {
      throw new Error("You must provide either categoryId or categoryName");
    }

    const options = {
      cmtype: this.pages ? undefined : "subcat",
    };

    const data = categoryName
      ? await this.categoryMembers({ categoryName, options })
      : await this.categoryMembers({ categoryId, options });

    for (const page of data) {
      if (page.ns === 14 && !this.categoryIds.includes(page.pageid)) {
        this.categoryIds.push(page.pageid);
        this.categorys.push(page.title);
      } else if (page.ns === 0) {
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
    fs.writeFileSync(filename, arr.join("\n"), (err, data) => {
      return data || err;
    });
  }
}
export default CategoryTree;
