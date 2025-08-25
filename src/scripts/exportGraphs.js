import dotenv from "dotenv";
import {
  findTemplates,
  getTemplateKeyValueData,
} from "../parser/newTemplateParser.js";
import logger from "../logger.js";

dotenv.config();

/**
 * Apply D3 format to a value
 * @param {string} value - The value to format
 * @param {string} format - D3 format string
 * @param {'number'|'time'} type - The type of format
 * @returns {string} - Formatted value
 */
export function applyD3Format(value, format, type = 'number') {
  if (!format || !value) return value;

  if (type === 'time') {
    // For time formats, we need to parse the date and apply the format
    // This is a simplified implementation - in a real scenario you'd use a full date formatting library
    const date = new Date(value);
    if (isNaN(date.getTime())) return value; // Invalid date, return as-is
    
    // Simple time format parsing for common cases
    switch (format) {
      case '%b %Y':
        const months = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני',
                       'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
        return `${months[date.getMonth()]} ${date.getFullYear()}`;
      case '%Y':
        return date.getFullYear().toString();
      case '%m/%d/%Y':
        return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
      default:
        return value; // Fallback for unsupported formats
    }
  }

  // Number formatting
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return value; // Not a number, return as-is

  switch (format) {
    case 's':
      // SI-prefix format
      const abs = Math.abs(numValue);
      if (abs >= 1e9) return (numValue / 1e9).toFixed(1) + 'G';
      if (abs >= 1e6) return (numValue / 1e6).toFixed(1) + 'M';
      if (abs >= 1e3) return (numValue / 1e3).toFixed(1) + 'k';
      if (abs >= 1) return numValue.toFixed(1);
      if (abs >= 1e-3) return (numValue * 1e3).toFixed(1) + 'm';
      if (abs >= 1e-6) return (numValue * 1e6).toFixed(1) + 'µ';
      return numValue.toExponential(1);
    case '%':
      // Percentage format
      return (numValue * 100).toFixed(1) + '%';
    case ',':
      // Comma thousands separator
      return numValue.toLocaleString();
    default:
      if (format.includes('%')) {
        return (numValue * 100).toFixed(1) + '%';
      } else if (format.includes('d')) {
        return Math.round(numValue).toString();
      } else if (format.includes('f')) {
        const precisionMatch = format.match(/\.(\d+)f/);
        const precision = precisionMatch ? parseInt(precisionMatch[1]) : 2;
        return numValue.toFixed(precision);
      } else if (format.includes(',')) {
        return numValue.toLocaleString();
      }
      return value; // Fallback for unsupported formats
  }
}

/**
 * Parse D3 v3 format strings and convert them to Commons chart format.
 * @param {string} format - D3 format string
 * @param {'number'|'time'} type - The type of format to generate
 * @returns {Object} - Formatted object for Commons charts
 */
export function parseD3Format(format, type = 'number') {
  if (!format) return null;

  if (type === 'time') {
    // Time formats - check if it's a D3 time format specifier
    if (format.includes('%')) {
      return { timeFormat: format };
    }
    // If it's not a time format, treat as string
    return { timeFormat: format };
  }

  // Number formats
  switch (format) {
    case 's':
      // SI-prefix format (e.g., "9.5M" for mega, "1.00µ" for micro)
      return { number: { style: 'si' } };
    case '%':
      // Percentage format
      return { number: { style: 'percent' } };
    case ',':
      // Comma thousands separator
      return { number: { style: 'decimal', grouping: true } };
    default:
      // Handle more complex patterns
      if (format.includes('%')) {
        // General percentage format with custom precision
        return { number: { style: 'percent' } };
      } else if (format.includes('d')) {
        // Integer format
        return { number: { style: 'integer' } };
      } else if (format.includes('f')) {
        // Fixed-point format
        const precisionMatch = format.match(/\.(\d+)f/);
        if (precisionMatch) {
          return { number: { style: 'decimal', precision: parseInt(precisionMatch[1]) } };
        }
        return { number: { style: 'decimal' } };
      } else if (format.includes(',')) {
        // Custom format with comma
        return { number: { style: 'decimal', grouping: true } };
      }
      // Default: treat as custom format string
      return { format: format };
  }
}

/**
 * Transliterate Hebrew text to English (phonetic).
 * @param {string} hebrew - Hebrew text to transliterate
 * @returns {string} - Transliterated English text
 */
export function transliterateHebrewToEnglish(hebrew) {
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

export function generateTabContentForGraphType(page) {
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

export function generateTabContentForXY(page) {
  const { title, template } = page;
  const { x, xAxisTitle: xTitle, yAxisTitle: yTitle, xAxisFormat, yAxisFormat } = template;

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

  // Apply formatting to data if formats are specified
  let processedXArr = xArr;
  let processedYArrays = yArrays;

  if (xAxisFormat) {
    processedXArr = xArr.map(value => applyD3Format(value, xAxisFormat, 'time'));
  }

  if (yAxisFormat) {
    processedYArrays = yArrays.map(yArr => 
      yArr.map(value => value ? applyD3Format(value, yAxisFormat, 'number') : value)
    );
  }

  // Create schema fields
  const fields = [{ name: "x", type: "string" }];
  if (xTitle) {
    fields[0].title = { he: xTitle };
  }

  // Add y fields
  processedYArrays.forEach((_, index) => {
    const fieldName = yParams.length === 1 ? "y" : `y${index + 1}`;
    const field = { name: fieldName, type: "string" };
    if (yTitles[index]) {
      field.title = { he: yTitles[index] };
    }
    fields.push(field);
  });

  // Create data rows
  const data = processedXArr.map((xItem, index) => {
    const row = [xItem];
    processedYArrays.forEach(yArr => {
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

export function generateTabContentForPie(page) {
  const { title, template } = page;
  const { x, yAxisFormat } = template;

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
    let values = yParam.split(",").map((item) => {
      const trimmed = item.trim();
      const numValue = trimmed === "" ? null : parseFloat(trimmed) || 0;
      
      // Apply yAxis formatting if specified
      if (yAxisFormat && numValue !== null) {
        const formatted = applyD3Format(numValue.toString(), yAxisFormat, 'number');
        // For pie charts, we still want the numeric value, but we could store the formatted version as well
        return numValue;
      }
      
      return numValue;
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

export function generateTabContent(page) {
  const tabData = generateTabContentForGraphType(page);
  console.log("Tab data:", JSON.stringify(tabData, null, 2));
  return JSON.stringify(tabData, null, 2);
}

export function generateChartContent(page) {
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
  
  // Support format strings coming from the original template (D3 v3-style)
  // Examples: xAxisFormat="%b %Y", yAxisFormat="s", yAxisFormat="%"
  if (template.xAxisFormat) {
    chartData.xAxis = chartData.xAxis || {};
    const xFormat = parseD3Format(template.xAxisFormat, 'time');
    Object.assign(chartData.xAxis, xFormat);
  }
  if (template.yAxisFormat) {
    chartData.yAxis = chartData.yAxis || {};
    const yFormat = parseD3Format(template.yAxisFormat, 'number');
    Object.assign(chartData.yAxis, yFormat);
  }
  console.log("Chart data:", chartData);
  return JSON.stringify(chartData, null, 2);
}

export function generateOutputContent(pages) {
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

export async function exportGraphsMain() {
  // Dynamically import Requests to avoid loading network modules during unit tests
  const { Requests } = await import("../requests/requests.js");
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
    title: "Template:גרף", options: { einamespace: 0 }
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

    const templates = findTemplates(content, "גרף", title);
    if (!templates || templates.length === 0) {
      logger.warn(`No template found in page: ${title}`);
      continue;
    }

    // Resolve English label once per page
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
    const baseEnName =
      enLabel?.entities?.[wikibaseItem]?.labels?.en?.value ||
      transliterateHebrewToEnglish(title);

    // Iterate over each graph template found on the page
    for (let i = 0; i < templates.length; i++) {
      const templateText = templates[i];
      const tplIndex = i + 1;
      const tplData = getTemplateKeyValueData(templateText);

      const pageList = { title, templateIndex: tplIndex };

      if (!tplData || !tplData.x) {
        const msg = `No template data found in page: ${title} (template #${tplIndex})`;
        logger.warn(msg);
        pageList.tabError = "No template data (missing x)";
        listPages.push(pageList);
        continue;
      }

      // Log all graph types for analysis
      const graphType = tplData.type || "no-type";
      logger.info(`Graph type: ${graphType}, page: ${title} (template #${tplIndex})`, { graphData: tplData });

      if (tplData.type && !["line", "pie", "rect", "area", "stackedrect"].includes(tplData.type)) {
        logger.warn(`Unsupported graph type: ${tplData.type}, page: ${title} (template #${tplIndex})`);
        pageList.tabError = `Unsupported graph type: ${tplData.type}`;
        listPages.push(pageList);
        continue;
      }

      // Build distinct english name per template when multiple templates exist
      const enName = templates.length === 1 ? baseEnName : `${baseEnName}_${tplIndex}`;

      // Prepare a small page-like object for generators
      const tplPage = { title, template: tplData, enName };
      logger.info(`Processing page: ${title} (template #${tplIndex})`, tplData);

      let tabCreated = false;
      try {
        const tabName = `Data:HeWiki.${enName}.tab`;
        const { edit, error } = await commonsClient.edit({
          title: tabName,
          text: generateTabContent(tplPage),
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
        logger.error(`Failed to edit tab for ${title} (template #${tplIndex}):`, error);
      }

      // רק אם דף הנתונים נוצר בהצלחה, ניצור את דף התרשים
      if (tabCreated) {
        try {
          const chartName = `Data:HeWiki.${enName}.chart`;
          const { edit: chartEdit, error: chartError } = await commonsClient.edit({
            title: chartName,
            text: generateChartContent(tplPage),
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
          logger.error(`Failed to edit chart for ${title} (template #${tplIndex}):`, error);
        }
      } else {
        pageList.chartError = "Chart not created - tab creation failed";
        logger.warn(`Skipping chart creation for ${title} (template #${tplIndex}) - tab creation failed`);
      }

      listPages.push(pageList);
    }
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
}

// Do not auto-run during tests. To execute the script, set RUN_EXPORT=true in env.
if (process.env.RUN_EXPORT === "true") {
  exportGraphsMain().catch((err) => {
    logger.error("exportGraphsMain failed:", err);
  });
}