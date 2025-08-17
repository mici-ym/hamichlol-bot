import dotenv from "dotenv";
import { Requests } from "../requests/requests.js";
import {
  findTemplate,
  getTemplateKeyValueData,
} from "../parser/newTemplateParser.js";
import logger from "../logger.js";

dotenv.config();

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

function generateTabContent(page) {
  const { title, template } = page;
  const { x, y, xAxisTitle: xTitle, yAxisTitle: yTitle } = template;
  const xArr = x.split(",").map((item) => item.trim());
  const yArr = y.split(",").map((item) => item.trim());
  const tabData = {
    license: "CC0-1.0",
    sources: `importing from [[:he:${title}]]`,
    schema: {
      fields: [
        { name: "x", type: "string" },
        { name: "y", type: "string" },
      ],
    },
    data: xArr.map((xItem, index) => {
      return [xItem, yArr[index]];
    }),
  };
  if (xTitle) {
    tabData.schema.fields[0].title = { he: xTitle };
  }
  if (yTitle) {
    tabData.schema.fields[1].title = { he: yTitle };
  }
  console.log("Tab data:", JSON.stringify(tabData, null, 2));
  return JSON.stringify(tabData, null, 2);
}

function generateChartContent(page) {
  const { title, template, enName } = page;
  const chartData = {
    license: "CC0-1.0",
    version: 1,
    sources: `importing from [[:he:${title}]]`,
    type: template.type || "line",
    title: enName,
    sources: `HeWiki.${enName}.tab`,
  };
  if (template.xAxisTitle) {
    chartData.xAxis = { title: template.xAxisTitle };
  }
  if (template.yAxisTitle) {
    chartData.yAxis = { title: template.yAxisTitle };
  }
  console.log("Chart data:", chartData);
  return JSON.stringify(chartData, null, 2);
}

function generateOutputContent(pages) {
  const output = [];
  for (const page of pages) {
    const { title, tabName, chartName } = page;
    output.push(
      `* [[${title}]] - [[commons:${tabName}|Tab]] - [[commons:${chartName}|Chart]]`
    );
  }
  return output.join("\n");
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
    withLogedIn: false,
  });
  await commonsClient.login(
    process.env.COMMONS_USERNAME,
    process.env.COMMONS_PASSWORD,
    "user"
  );

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
    page.template = getTemplateKeyValueData(template);
    if (!page.template || !page.template.x) {
      logger.warn(`No template data found in page: ${title}`);
      continue;
    }
    if (page.template.type && page.template.type !== "line") {
      logger.warn(`type of graph not line, page: ${title}`);
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
    const tabName = `Data:HeWiki.${page.enName}.tab`;
    const pageList = { title };

    const { edit, error } = await commonsClient.edit({
      title: tabName,
      text: generateTabContent(page),
      summary: `Importing graph data from [[:he:${title}]]`,
      //createonly: true,
    });

    if (edit) {
      pageList.tabName = tabName;
      logger.info(`Successfully edited tab: ${tabName}`, edit);
    } else {
      logger.error(`Error editing tab: ${tabName}`, error);
    }
    const chartName = `Data:HeWiki.${page.enName}.chart`;
    const { edit: chartEdit, error: chartError } = await commonsClient.edit({
      title: chartName,
      text: generateChartContent(page),
      summary: `Importing graph data from [[:he:${title}]]`,
      createonly: true,
    });

    if (chartEdit) {
      pageList.chartName = chartName;
      logger.info(`Successfully edited chart: ${chartName}`, chartEdit);
    } else {
      logger.error(`Error editing chart: ${chartName}`, chartError);
    }
    listPages.push(pageList);
  }
  logger.info("List of pages with graphs:", listPages);
  await commonsClient.logout();

  wikiClient
    .login(process.env.WIKI_USERNAME, process.env.WIKI_PASSWORD, "user")
    .then((login) => {
      if (login) {
        wikiClient
          .edit({
            title: "משתמש:מיכי י-ם/ייצוא גרפים",
            summary: "לוג ייצוא גרפים",
            content: generateOutputContent(listPages) + "\n\n~~~~",
            section: "new",
            sectiontitle: "ייצוא גרפים"
          })
          .then((edit) => {
            logger.info(`Successfully edited user page: ${edit.title}`, edit);
            wikiClient.logout();
          })
          .catch((error) => {
            logger.error(`Error editing user page: ${error}`);
            wikiClient.logout();
          });
      }
    });
})();
