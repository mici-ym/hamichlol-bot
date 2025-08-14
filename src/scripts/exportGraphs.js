import { Requests } from "../requests/requests.js";
import {
  findTemplate,
  getTemplateKeyValueData,
} from "../parser/newTemplateParser.js";
import logger from "../logger.js";
/**
 * Transliterate Hebrew text to English (phonetic).
 * @param {string} hebrew - Hebrew text to transliterate
 * @returns {string} - Transliterated English text
 */
function transliterateHebrewToEnglish(hebrew) {
  const map = {
    א: "a",
    ב: "b",
    ג: "g",
    ד: "d",
    ה: "h",
    ו: "v",
    ז: "z",
    ח: "ch",
    ט: "t",
    י: "y",
    כ: "k",
    ך: "k",
    ל: "l",
    מ: "m",
    ם: "m",
    נ: "n",
    ן: "n",
    ס: "s",
    ע: "e",
    פ: "p",
    ף: "p",
    צ: "tz",
    ץ: "tz",
    ק: "k",
    ר: "r",
    ש: "sh",
    ת: "t",
    " ": " ",
    "-": "-",
    "'": "'",
  };
  return hebrew
    .split("")
    .map((c) => map[c] || c)
    .join("");
}

(async () => {
  // Wikimedia user-agent policy: English only, include bot name/version and user page/contact (URL-encoded if needed)
  const userAgent = `wikipedia-script/1.0 (https://he.wikipedia.org/wiki/User:%D7%9E%D7%99%D7%9B%D7%99_%D7%99-%D7%9D)`;
  const wikiClient = new Requests({
    wikiUrl: "https://he.wikipedia.org/w/api.php",
    withLogedIn: false,
    userAgent,
    proxyOptions: { type: "socks", host: "localhost", port: 8080 },
  });
  const wikiDataClient = new Requests({
    wikiUrl: "https://www.wikidata.org/w/api.php",
    withLogedIn: false,
    userAgent,
  });
  const commonsClient = new Requests({
    wikiUrl: "https://commons.wikimedia.org/w/api.php",
    userAgent,
  });
  /*await commonsClient.login(
    process.env.COMMONS_USERNAME,
    process.env.COMMONS_PASSWORD
  );*/

  const pagesWithGraph = await wikiClient.embeddedin({
    title: "Template:גרף",
    namespace: 0,
    limit: 500,
  });
  console.log("Graph pages:", pagesWithGraph);
  const graphPages = pagesWithGraph.map((page) => page.title);
  //console.log("Graph pages:", graphPages);
  const propsPages = await wikiClient.queryPages({
    titles: graphPages,
    options: {
      prop: "pageprops|revisions",
      formatversion: "2",
      ppprop: "wikibase_item",
      rvprop: "content",
      rvslots: "main",
    },
  });
  const dataPages = Object.values(propsPages).map((page) => {
    const { title, pageprops, revisions } = page;
    const wikibaseItem = pageprops?.wikibase_item || "";
    const content = revisions?.[0]?.slots?.main?.content || "";
    return { title, wikibaseItem, content };
  });
  //console.log("Data pages:", dataPages);
  const listPages = [];
  for (const page of dataPages) {
    const { title, wikibaseItem, content } = page;
    // Process each data page as needed
    if (!content) {
      logger.warn(`No content for page: ${title}`);
      continue;
    }
    const template = findTemplate(content, "גרף", title);
    if (!template) {
      logger.warn(`No template found in page: ${title}`);
      continue;
    }
    const enLabel = await wikiDataClient.wikiGet({
      action: "wbgetentities",
      format: "json",
      ids: wikibaseItem,
      props: "labels",
      languages: "en",
      languagefallback: 1,
      formatversion: "2",
    });
    console.log("English label:", enLabel);
    page.enName =
      enLabel?.entities?.[wikibaseItem]?.labels?.en?.value ||
      transliterateHebrewToEnglish(title);
    page.template = getTemplateKeyValueData(template);
    if (!page.template || !page.template.x) {
      logger.warn(`No template data found in page: ${title}`);
      continue;
    }
    const tabName = `Data:HEwiki.chart.${page.enName}.tab`;
    const pageList = { title };
    await commonsClient
      .edit({
        title: tabName,
        text: generateTabContent(page),
        createonly: true,
      })
      .then((edit) => {
        pageList[title].tabName = tabName;
        logger.info(`Successfully edited tab: ${tabName}`, edit);
      })
      .catch((error) => {
        logger.error(`Error editing tab: ${tabName}`, error);
      });
    const chartName = `Data:HEwiki.${page.enName}.chart`;
    await commonsClient
      .edit({
        title: chartName,
        text: generateChartContent(dataPages),
        createonly: true,
      })
      .then((edit) => {
        pageList[title].chartName = chartName;
        logger.info(`Successfully edited chart: ${chartName}`, edit);
      })
      .catch((error) => {
        logger.error(`Error editing chart: ${chartName}`, error);
      });
    listPages.push(pageList);
  }
  logger.info("List of pages with graphs:", listPages);
  //commonsClient.logout();
  /*wikiClient.login(process.env.WIKI_USERNAME, process.env.WIKI_PASSWORD).then((login) => {
        if (login) {
            wikiClient.edit({
                title: "משתמש:מיכי י-ם/ייצוא גרפים",
                content: generateTemplateContent(listPages),
            }).then((edit) => {
                logger.info(`Successfully edited user page: ${edit.title}`, edit);
                wikiClient.logout();
            }).catch((error) => {
                logger.error(`Error editing user page: ${error}`);
            });
        }
    })*/
})();
