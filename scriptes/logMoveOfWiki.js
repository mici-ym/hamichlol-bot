import { requests } from "../requests/requests.js";

const wikiRequest = new requests("https://import.hamichlol.org.il/");
const request = new requests("https://www.hamichlol.org.il/w/api.php");

/**
 * The `main` function asynchronously fetches log events from a wiki API and processes them.
 * It makes a request to the wiki API to retrieve log events of type "move" within a specified date range.
 * After fetching the log events, it passes the response to the `processor` function for further processing
 * and logs the length of the response to the console.
 */
async function main() {
  // Await the response from the wikiRequest's query method, passing in the query options.
  const res = await wikiRequest.query({
    options: {
      list: "logevents", // Specifies the type of list to fetch - log events.
      leprop: "title|type|timestamp|comment|details", // Properties to include in each log event.
      letype: "move", // Filters the log events to only include "move" type events.
      lestart: "2024-05-01T00:00:00.000Z", // The start timestamp for fetching log events.
      leend: "2024-02-00T00:00:00.000Z", // The end timestamp for fetching log events.
      lenamespace: 0, // Specifies the namespace of the pages to fetch log events for.
      lelimit: "max", // Sets the limit for the number of log events to fetch to the maximum allowed.
    },
    withCookie: false, // Indicates whether to include cookies in the request.
  });
  processor(res); // Passes the fetched log events to the processor function for processing.
  console.log(res.length); // Logs the length of the response to the console.
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
    withCookie: false,
  });
}

function createArr(list) {
  const arr = list.map((item) => {
    return item;
  });
  return arr;
}

async function createTable(arr, target, max) {
  const titles = createArr(arr);
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

function processorLog(list) {
  return list.map((item) => {
    return { from: item.title, to: item.params.target_title }; //item.title;
  });
}

async function processor(list) {
  let stringData = "";
  const objOfHe = {
    redirect: "הפניה",
    missing: "לא קיים",
    exist: "קיים",
  };
  const logList = processorLog(list);
  const dataForPagesLocal = await createTable(
    logList.flatMap((obj) => [obj.from, obj.to]),
    "loc",
    50
  );
  const dataForPagesWiki = await createTable(
    logList.map((obj) => {
      return obj.from;
    }),
    "wiki",
    50
  );
  for (const item of logList) {
    if (
      cackDataPage(dataForPagesLocal[item.from]) ===
        cackDataPage(dataForPagesWiki[item.from]) &&
      cackDataPage(dataForPagesLocal[item.to]) === "exist"
    ) {
      continue;
    } else {
      stringData += `* [[${item.from}]] (מ: ${
        objOfHe[cackDataPage(dataForPagesLocal[item.from])]
      }, w: ${objOfHe[cackDataPage(dataForPagesWiki[item.from])]}) ==> [[${item.to}]] (${
        objOfHe[cackDataPage(dataForPagesLocal[item.to])]
      })\n`;
    }
  }
  request.edit({
    title: "משתמש:מוטי בוט/לוגים",
    text: `@[[משתמש:מוטי|מוטי]] {{טורים|תוכן=${stringData}}} ~~~~`,
    summary: 'דו"ח העברות ויקי',
    section: "new",
    sectiontitle: "יומן העברות ויקי",
    nocreate: false,
  })
}

function cackDataPage(data) {
  if (data.redirect === "") {
    return "redirect";
  }
  if (data.missing === "") {
    return "missing";
  }
  return "exist";
}
main();
