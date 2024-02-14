import CategoryTree from "./categorytree.js";

const categoryTree = new CategoryTree("https://www.hamichlol.org.il");

async function main() {
  const [pages] = await categoryTree.createCategoryTree({
    categoryName: "יחסים בילטרליים לפי מדינה",
    pages: true
  });
  for (const page of pages) {
    if (/\w*\s?\w+\s\w+–\w+\w*\s?\w*/.test(page.title)) {
      categoryTree
        .move(page.title, page.title.replace(/(–)/, " $1 "), "השוואה לוויקיפדיה העברית")
        .then((data) => console.log(data))
        .catch(console.error);
    }
  }
}
main();
