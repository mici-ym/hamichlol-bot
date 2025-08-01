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
    
    // Check if query returned any results
    if (!query || Object.keys(query).length === 0) {
      logger.info("No new pages found in category since last run");
      return;
    }
    
    let count = 0;
    for (const page in query) {
      if (query[page].allevel === "edit-semi") continue;
      const { aspaklaryalockdown: data, error } = await request.lockPage({
        title: query[page].title,
        level: "edit-semi",
        reason: "ערך מילוני",
      });
      if (error) {
        logger.error(`Error locking page ${query[page].title}:`, error);
        continue;
      }
      logger.info(`Page ${data.title} is locked`, data);
      count++;
    }
    logger.info(`${count} pages locked`);
  } catch (error) {
    logger.error("Error in cat() function:", error);
    // Don't exit on error, just log it
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
    
    // Check if query returned any results
    if (!query || Object.keys(query).length === 0) {
      logger.info("No recent changes found since last run");
      return;
    }
    
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
        } else if (categories[0].title === "קטגוריה:המכלול: ערכים מילוניים") {
          const { aspaklaryalockdown: data } = await request.lockPage({
            title: query[page].title,
            level: "edit-semi",
            reason: "ערך מילוני",
          });
          logger.info(`Page ${data.title} is locked`, data);
          count.semi++;
        }
      }
    }
    logger.info(`Pages unlocked: ${count.none}, pages locked: ${count.semi}`);
  } catch (error) {
    logger.error("Error in rc() function:", error);
    // Don't exit on error, just log it
  }
}

async function main() {
  try {
    const start =
      process.env.LAST_RUN ||
      new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days ago
    
    console.log(`Processing changes since: ${start}`);
    logger.info(`Starting manageLockPage with start time: ${start}`);
    
    await cat(start);
    await rc(start);
    
    logger.info("manageLockPage completed successfully");
    request.logout();
  } catch (error) {
    logger.error("Fatal error in main():", error);
    process.exit(1);
  }
}

main();
