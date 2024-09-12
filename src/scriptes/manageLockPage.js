import { getRequestsInstance } from "../requests/requests.js";
import logger from "../logger.js";

const request = getRequestsInstance();

async function cat(gcmstart) {
  try {
    const query = await request.query({
      options: {
        prop: "info",
        generator: "categorymembers",
        formatversion: "2",
        inprop: "allevel",
        gcmtitle: "קט:המכלול: ערכים מילוניים",
        gcmlimit: "max",
        gcmsort: "timestamp",
        gcmstart,
      },
    });
    let count = 0;
    for (const page in query) {
      if (query[page].allevel === "edit-semi") continue;
      const { aspaklaryalockdown: data } = await request.lockPage({
        title: query[page].title,
        level: "edit-semi",
        reason: "ערך מילוני",
      });
      logger.info(`Page ${data.title} is locked`, data);
      count++;
    }
    logger.info(`${count} pages locked`);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}

async function rc(rcstart) {
  const params = {
    prop: "info|categories",
    generator: "recentchanges",
    formatversion: "2",
    inprop: "allevel",
    cllimit: "max",
    clcategories: "קטגוריה:המכלול: ערכים מילוניים",
    grcnamespace: "0",
    grctag: "פתיחת ערך חסום",
    grcstart: rcstart,
    grcdir: "newer",
    grclimit: "max",
    grctype: "edit",
  };
  try {
    const query = await request.query({ options: params });
    let count = { none: 0, semi: 0 };
    for (const page in query) {
      const { allevel, title, categories } = query[page];
      if (allevel === "edit-full") {
        if (!categories) {
          const { aspaklaryalockdown: data } = await request.lockPage({
            title,
            level: "none",
            reason: "טופל, לא מילוני",
          });
          logger.info(`Page ${data.title} is unlocked`, data);
          count.none++;
          //console.log(`Page ${title} is unlocked`, data);
        } else if (categories[0].title === "קטגוריה:המכלול: ערכים מילוניים") {
          const { aspaklaryalockdown: data } = await request.lockPage({
            title: query[page].title,
            level: "edit-semi",
            reason: "ערך מילוני",
          });
          logger.info(`Page ${data.title} is locked`, data);
          count.semi++;
          //console.log(`Page ${title} is locked`, data);
        }
      }
    }
    logger.info(`Pages unlocked: ${count.none}, pages locked: ${count.semi}`);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}

async function main() {
  const start = process.env.LAST_RUN || new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days ago
  await cat(start);
  await rc(start);
  request.logout();
}
main();
