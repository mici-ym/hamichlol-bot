import { Requests } from "../requests/requests.js";

const wikiRequest = new Requests("https://he.wikipedia.org/w/api.php");
wikiRequest.withLogedIn = false;
const request = new Requests("https://www.hamichlol.org.il/w/api.php");

/**
 * The `main` function asynchronously fetches log events from a wiki API and processes them.
 * It makes a request to the wiki API to retrieve log events of type "move" within a specified date range.
 * After fetching the log events, it passes the response to the `processor` function for further processing
 * and logs the length of the response to the console.
 */
async function main(ns = 0) {
  // Await the response from the wikiRequest's query method, passing in the query options.
  const res = await wikiRequest.query({
    options: {
      list: "logevents", // Specifies the type of list to fetch - log events.
      leprop: "title|type|timestamp|comment|details", // Properties to include in each log event.
      letype: "move", // Filters the log events to only include "move" type events.
      lestart: "2024-12-01T00:00:00.000Z", // The start timestamp for fetching log events.
      leend: "2024-10-00T00:00:00.000Z", // The end timestamp for fetching log events.
      lenamespace: ns, // Specifies the namespace of the pages to fetch log events for.
      lelimit: "max", // Sets the limit for the number of log events to fetch to the maximum allowed.
    },
  });
  processor(res, ns); // Passes the fetched log events to the processor function for processing.
  console.log(res.length); // Logs the length of the response to the console.
}

async function processor(list, ns) {
  let stringData = "";
  const objOfHe = {
    redirect: "הפניה",
    missing: "לא קיים",
    exist: "קיים",
    "no info": "???",
  };
  const stringOfNs = {
    0: "ערכים",
    10: "תבניות",
    14: "קטגוריות",
  };
  const logList = list.map((logItem) => {
    return { from: logItem.title, to: logItem.params.target_title }; //item.title;
  });
  const titlesList = new Set();
  for (const item of logList) {
    titlesList.add(item.from);
    titlesList.add(item.to);
  }
  const dataForPagesLocal = await createTable(titlesList, "loc", 30);
  const dataForPagesWiki = await createTable(titlesList, "wiki", 30);
  const badTitle = new RegExp(/(BDSM|להט"ב|לט"ב|להטב"ק|לסבית|לסביות|סקסואל|קסואל|מצעד הגאווה|מיניות|פורנוגרפיה|\[\[פין\]\]|\[\[פות\]\])/, "i");


  for (const item of logList) {
    if (
      (cackDataPage(dataForPagesLocal[item.from]) ===
        cackDataPage(dataForPagesWiki[item.from]) &&
        cackDataPage(dataForPagesLocal[item.to]) ===
          cackDataPage(dataForPagesWiki[item.to])) ||
      badTitle.test(item.to) ||
      badTitle.test(item.from)
    ) {
      continue;
    }
    stringData += `* [[${item.from}]] <small>(מ: ${
      objOfHe[cackDataPage(dataForPagesLocal[item.from])]
    }, w: ${objOfHe[cackDataPage(dataForPagesWiki[item.from])]})</small> => [[${
      item.to
    }]] <small>(${
      objOfHe[cackDataPage(dataForPagesLocal[item.to])]
    })</small>\n`;
  }
  request
    .edit({
      title: "משתמש:מוטי בוט/לוג העברות ויקי",
      text: `{{טורים|תוכן=\n${stringData}}}\n@[[משתמש:מוטי|מוטי]], @[[U:נריה|נריה]] לתשו"ל. תודה! ~~~~`,
      summary: 'דו"ח העברות ויקי',
      section: "new",
      sectiontitle: `דו"ח העברות ויקי - ${stringOfNs[ns]}`,
      nocreate: false,
    })
    .finally((data) => {
      console.log(data);
      switch (ns) {
        case 0:
          main(14);
          break;
        case 14:
          main(10);
          break;

        default:
          console.log("done");
          break;
      }
    });
}

async function createTable(titles, target, max) {
  let arrData = {};
  do {
    if (titles.length < max) {
      Object.assign(arrData, await dataOfPages(titles.join("|"), target));
    }
    Object.assign(
      arrData,
      await dataOfPages(titles.splice(0, max).join("|"), target)
    );
  } while (titles.length > 0);

  return arrData;
}

/**
 * Asynchronously fetches data for a list of page titles from a specified wiki API.
 * This function determines the appropriate request object to use based on the target parameter,
 * then queries for pages information including redirects. It supports querying from either
 * a local or external wiki API, as indicated by the `target` parameter.
 *
 * @param {string[]} titles - An array of page titles to query information for.
 * @param {string} target - A string indicating the target API to use. Can be 'wiki' for the external wiki API or any other string for the local API.
 * @returns {Promise<Object>} A promise that resolves to an object containing the queried pages' data.
 */
async function dataOfPages(titles, target) {
  const requestTarget = target === "wiki" ? wikiRequest : request;
  return await requestTarget.queryPages({
    titles: titles,
    useIdsOrTitles: "titles",
    options: {
      prop: "info|redirects",
      rdprop: "title",
    },
    method: "POST",
  });
}

function cackDataPage(data) {
  if (data === undefined) {
    return "No info";
  }
  if (data.redirect === "") {
    return "redirect";
  }
  if (data.missing === "") {
    return "missing";
  }
  return "exist";
}
main();
