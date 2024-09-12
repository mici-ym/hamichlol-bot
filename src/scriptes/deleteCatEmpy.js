import { getRequestsInstance } from "../requests/requests.js";
import logger from "../logger.js";

const req = getRequestsInstance();
const wiki = getRequestsInstance("wiki");

async function main() {
  try {
    const queryResult = await req.query({
      options: {
        list: "querypage",
        formatversion: "2",
        qppage: "Unusedcategories",
        qplimit: "max",
      },
    });
    const localList = [
      ...queryResult[0].results,
      ...queryResult[1].results,
    ].map((cat) => cat.title);
    const wikiList = {};
    while (localList.length > 0) {
      Object.assign(
        wikiList,
        await wiki.queryPages({
          titles: localList.splice(0, 30).join("|"),
          useIdsOrTitles: "titles",
          withCookie: false,
        })
      );
    }
    let deletedCategories = 0;
    for (const category of Object.keys(wikiList)) {
      if (wikiList[category].pageid === -1 && !category.includes("המכלול")) {
        const data = await req.delete(
          category.category,
          "קטגוריה ריקה - לא קיימת בוויקיפדיה"
        );
        logger.info(`Deleted category: ${category.category}`, data);
        deletedCategories++;
      }
    }
    logger.info(
      `Deleted ${deletedCategories} unused categories of ${localList.length}.`
    );
    req.logout();
  } catch (error) {
    logger.error(error);
  }
}
main();
