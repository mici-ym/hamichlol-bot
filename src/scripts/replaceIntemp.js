import { Requests } from "../requests/requests.js";
import {
  findTemplate,
  getTemplateArrayData,
  templateFromArrayData,
} from "../parser/newTemplateParser.js";
import logger from "../logger.js";

(async () => {
  const wikiClient = new Requests({
    wikiUrl: "https://he.wikipedia.org/w/api.php",
    userAgent:
      "wikipedia-bot (https://he.wikipedia.org/wiki/U:%D7%9E%D7%99%D7%9B%D7%99_%D7%99-%D7%9D)",
    proxyOptions: {
      type: "socks",
      host: "localhost",
      port: 8080,
    },
  });
  const queryParams = {
    prop: "revisions",
    generator: "embeddedin",
    formatversion: "2",
    rvprop: "content",
    rvslots: "main",
    geititle: "תבנית:מפלגה/מדינה בפרלמנט האירופי",
    geilimit: "max",
  };
  let pages;
  try {
    await wikiClient.login(process.env.WIKI_USERNAME, process.env.WIKI_PASSWORD);
    pages = await wikiClient.query({ options: queryParams });
    logger.info(`Found ${pages.length} pages`);
  } catch (error) {
    logger.error(`Failed to query pages`, error);
    return;
  }
  for (const page in pages) {
    if (!pages[page].revisions || pages[page].revisions.length === 0) continue;
    const content = pages[page].revisions[0].slots.main.content;
    const template = findTemplate(
      content,
      "מפלגה/מדינה בפרלמנט האירופי",
      pages[page].title
    );
    if (!template) continue;
    const data = getTemplateArrayData(template, "מפלגה/מדינה בפרלמנט האירופי");
    logger.info(`Template data for ${pages[page].title}:`, data);
    // Swap positional parameters 1 and 2 (if present) to change their order
    if (data.length > 0) {
      const tmp = data[0];
      data[0] = data[1];
      data[1] = tmp;
    }
    console.log("Data after swap:", data);
    const newTemplate = templateFromArrayData(
      data,
      "מפלגה/מדינה בפרלמנט האירופי"
    );
    console.log("New Template:", JSON.stringify(newTemplate, null, 2));
    if (!newTemplate || newTemplate === template) continue;
    const newContent = content.replace(template, newTemplate);
    try {
      const { edit, error } = await wikiClient.edit({
        title: pages[page].title,
        text: newContent,
        summary: "החלפת סדר פרמטרים בתבנית מפלגה/מדינה בפרלמנט האירופי",
        bot: true,
        minor: true,
        nocreate: true,
      });
      if (edit) {
        logger.info(`Edited page: ${pages[page].title}`, edit);
      } else {
        logger.error(`Failed to edit page: ${pages[page].title}`, error);
      }
    } catch (error) {
      logger.error(`Failed to edit page: ${page.title}`, error);
    }
  }
  wikiClient.logout();
})();
