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

function generateTabContentForGraphType(page) {
  const { title, template } = page;
  const graphType = template.type || "line";

  switch (graphType) {
    case "line":
    case "area":
    case "rect":
    case "stackedrect":
      return generateTabContentForXY(page);
    case "pie":
      return generateTabContentForPie(page);
    default:
      throw new Error(`Unsupported graph type: ${graphType}`);
  }
}

function generateTabContentForXY(page) {
  const { title, template } = page;
  const { x, xAxisTitle: xTitle, yAxisTitle: yTitle } = template;

  // Parse x values
  const xArr = x.split(",").map((item) => item.trim());

  // Find all y parameters (y, y1, y2, y3, etc.)
  const yParams = [];
  const yTitles = [];

  // Check for regular 'y' parameter first
  if (template.y) {
    yParams.push(template.y);
    yTitles.push(yTitle || "y");
  }

  // Check for y1, y2, y3, etc.
  for (let i = 1; i <= 10; i++) { // Support up to y10
    const yParam = template[`y${i}`];
    const yTitleParam = template[`y${i}Title`];
    if (yParam) {
      yParams.push(yParam);
      yTitles.push(yTitleParam || `y${i}`);
    }
  }

  if (yParams.length === 0) {
    throw new Error(`No y parameters found in template for page: ${title}`);
  }

  // Parse y values and handle empty strings
  const yArrays = yParams.map(yParam =>
    yParam.split(",").map((item) => {
      const trimmed = item.trim();
      return trimmed === "" ? null : trimmed;
    })
  );

  // Create schema fields
  const fields = [{ name: "x", type: "string" }];
  if (xTitle) {
    fields[0].title = { he: xTitle };
  }

  // Add y fields
  yArrays.forEach((_, index) => {
    const fieldName = yParams.length === 1 ? "y" : `y${index + 1}`;
    const field = { name: fieldName, type: "string" };
    if (yTitles[index]) {
      field.title = { he: yTitles[index] };
    }
    fields.push(field);
  });

  // Create data rows
  const data = xArr.map((xItem, index) => {
    const row = [xItem];
    yArrays.forEach(yArr => {
      row.push(yArr[index] || null);
    });
    return row;
  });

  return {
    license: "CC0-1.0",
    sources: `importing from [[:he:${title}]]`,
    schema: { fields },
    data
  };
}

function generateTabContentForPie(page) {
  const { title, template } = page;
  const { x } = template;

  // Parse x values (these become field names/labels)
  const xArr = x.split(",").map((item) => item.trim());

  // Find all y parameters for pie chart
  const yParams = [];

  // Check for y1, y2, etc. (pie charts often use y1, y2 for different data series)
  for (let i = 1; i <= 10; i++) {
    const yParam = template[`y${i}`];
    if (yParam) {
      yParams.push(yParam);
    }
  }

  if (yParams.length === 0) {
    throw new Error(`No y parameters found in pie chart for page: ${title}`);
  }

  // Create schema fields - X values become field names, but sanitized for Commons
  const fields = xArr.map((label, index) => ({
    name: `field_${index + 1}`,  // Use safe field names
    type: "number",
    title: { he: label }  // Original label in title
  }));

  // Create data rows - each Y parameter becomes a data row
  const data = yParams.map(yParam => {
    const values = yParam.split(",").map((item) => {
      const trimmed = item.trim();
      return trimmed === "" ? null : parseFloat(trimmed) || 0;
    });
    // Pad or trim values to match the number of fields
    while (values.length < xArr.length) {
      values.push(null);
    }
    return values.slice(0, xArr.length);
  });

  return {
    license: "CC0-1.0",
    sources: `importing from [[:he:${title}]]`,
    schema: { fields },
    data
  };
}

function generateTabContent(page) {
  const tabData = generateTabContentForGraphType(page);
  console.log("Tab data:", JSON.stringify(tabData, null, 2));
  return JSON.stringify(tabData, null, 2);
}

function generateChartContent(page) {
  const { title, template, enName } = page;
  const chartData = {
    license: "CC0-1.0",
    version: 1,
    source: `HeWiki.${enName}.tab`,  // שדה נכון לציון קובץ הנתונים
    type: template.type || "line",
    title: { en: enName, he: title },  // פורמט LocalizableString
    sources: `importing from [[:he:${title}]]`,  // מידע על מקור הנתונים
  };
  if (template.xAxisTitle) {
    chartData.xAxis = { title: { he: template.xAxisTitle } };  // פורמט LocalizableString
  }
  if (template.yAxisTitle) {
    chartData.yAxis = { title: { he: template.yAxisTitle } };  // פורמט LocalizableString
  }
  console.log("Chart data:", chartData);
  return JSON.stringify(chartData, null, 2);
}

function generateOutputContent(pages) {
  const output = [];
  for (const page of pages) {
    const { title, tabName, chartName, tabError, chartError } = page;

    let line = `* [[${title}]]`;

    if (tabName) {
      line += ` - [[commons:${tabName}|Tab ✓]]`;
    } else if (tabError) {
      line += ` - Tab ✗ (${tabError})`;
    }

    if (chartName) {
      line += ` - [[commons:${chartName}|Chart ✓]]`;
    } else if (chartError) {
      line += ` - Chart ✗ (${chartError})`;
    }

    output.push(line);
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
    title: "Template:גרף", options: { einamespace: 10 }
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

    // Log all graph types for analysis
    const graphType = page.template.type || "no-type";
    logger.info(`Graph type: ${graphType}, page: ${title}`, { graphData: page.template });

    if (page.template.type && !["line", "pie", "rect", "area", "stackedrect"].includes(page.template.type)) {
      logger.warn(`Unsupported graph type: ${page.template.type}, page: ${title}`);
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
    logger.info(`Processing page: ${title}, data:`, page.template);

    let tabCreated = false;
    try {
      const { edit, error } = await commonsClient.edit({
        title: tabName,
        text: generateTabContent(page),
        summary: `Importing graph data from [[:he:${title}]]`,
        //createonly: true,
      });

      if (edit) {
        pageList.tabName = tabName;
        tabCreated = true;
        logger.info(`Successfully edited tab: ${tabName}`, edit);
      } else {
        pageList.tabError = error?.info || "Unknown error creating tab";
        logger.error(`Error editing tab: ${tabName}`, error);
      }
    } catch (error) {
      pageList.tabError = error.message || "Exception while creating tab";
      logger.error(`Failed to edit tab ${tabName}:`, error);
    }

    // רק אם דף הנתונים נוצר בהצלחה, ניצור את דף התרשים
    if (tabCreated) {
      try {
        const chartName = `Data:HeWiki.${page.enName}.chart`;
        const { edit: chartEdit, error: chartError } = await commonsClient.edit({
          title: chartName,
          text: generateChartContent(page),
          summary: `Importing graph data from [[:he:${title}]]`,
          //createonly: true,
        });

        if (chartEdit) {
          pageList.chartName = chartName;
          logger.info(`Successfully edited chart: ${chartName}`, chartEdit);
        } else {
          pageList.chartError = chartError?.info || "Unknown error creating chart";
          logger.error(`Error editing chart: ${chartName}`, chartError);
        }
      } catch (error) {
        pageList.chartError = error.message || "Exception while creating chart";
        logger.error(`Failed to edit chart ${pageList.chartName}:`, error);
      }
    } else {
      pageList.chartError = "Chart not created - tab creation failed";
      logger.warn(`Skipping chart creation for ${title} - tab creation failed`);
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
            text: generateOutputContent(listPages) + "\n\n~~~~",
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