import { getRequestsInstance } from "../requests/requests.js";
import logger from "../logger.js";

const hamichlol = getRequestsInstance();
const wikipedia = getRequestsInstance(
  "wiki",
  "https://import.hamichlol.org.il/"
);
wikipedia.withLogedIn = false;

async function main() {
  try {
    const { parse: jsonList } = await hamichlol.parse({
      pageid: 967200,
    });
    if (!jsonList) {
      logger.error("not parse");
      throw new Error("not parse");
    }
    const { titles } = JSON.parse(jsonList.wikitext["*"]);
    logger.info(titles);
    const options = {
      prop: "revisions",
      rvprop: "timestamp|content|ids",
      rvslots: "main",
    };
    const [dataTitles, dataTitlesOfWiki] = await Promise.all([
      hamichlol.queryPages({
        titles,
        options: {
          prop: "revisions",
          rvprop: "timestamp",
        },
        useIdsOrTitles: "titles",
      }),
      wikipedia.queryPages({
        titles,
        options,
        useIdsOrTitles: "titles",
      }),
    ]);
    for (const [title, page] of Object.entries(dataTitlesOfWiki)) {
      if (
        new Date(dataTitles[title].revisions[0].timestamp) <
        new Date(page.revisions[0].timestamp)
      ) {
        await hamichlol
          .edit({
            title,
            text: page.revisions[0].slots.main["*"],
            summary: `עדכון מוויקיפדיה גרסה ${page.revisions[0].revid}`,
          })
          .then(async ({ edit: data }) => {
            logger.info(`edited page: ${title}`, data);
            await proge(title).then(() => logger.info(`purged page: ${title}`));
          });
      }
    }
    hamichlol.logout();
  } catch (error) {
    logger.error(error);
  }
}
async function proge(title) {
  const params = {
    action: "purge",
    format: "json",
    generator: "embeddedin",
    utf8: 1,
    formatversion: "2",
    geititle: title,
    geilimit: "500",
  };
  const res = await fetch("https://www.hamichlol.org.il/w/api.php", {
    method: "POST",
    credentials: "include",
    body: new URLSearchParams({ format: "json", utf8: 1, ...params }),
  });
  return await res.json();
}
main();
