import { Requests } from "../../requests/requests.js";

const wikipediaClient = new Requests({
  wikiUrl: "https://import.hamichlol.org.il/",
  userAgent: "Bot Template Updater/1.0 (https://example.com/bot)",
  withLogedIn: false,
});
const hamiclolClient = new Requests({
  wikiUrl: "https://www.hamichlol.org.il/w/api.php",
  userAgent: "Bot Template Updater/1.0 (https://example.com/bot)",
});

const TITLES = [
  "תבנית:בוט יישובים/0026",
  "תבנית:נתוני מדינות/ישראל",
];

async function getLastUpdateTimes(client) {
  try {
    const queryResult = await client.queryPages({
      titles: TITLES,
      useIdsOrTitles: "titles",
      method: "GET",
      options: {
        prop: "revisions",
        rvprop: "timestamp",
      },
    });

    if (!queryResult || Object.keys(queryResult).length === 0) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(queryResult).map(([title, page]) => [
        title,
        Date.parse(page?.revisions?.[0]?.timestamp) ?? null,
      ])
    );
  } catch (error) {
    console.error("Error getting last update times:", error.message);
    throw error;
  }
}

/**
 * Get the full content of a page
 *
 * @param {Requests} client - The Requests API client instance
 * @param {string} pageTitle - The title of the page to fetch
 * @returns {Promise<string|null>} The page content as a string, or null if page not found
 *
 * @example
 * const content = await getPageContent(client, 'תבנית:MyTemplate');
 * console.log(content); // "{{documentation|...}}"
 */
async function getPagesContent(client, category) {
  try {
    const generatorResult = await client.query({
      options: {
        generator: "categorymembers",
        gcmtitle: `קטגוריה:${category}`,
        gcmnamespace: 10, // Namespace for templates
        prop: "revisions",
        rvprop: "content",
        rvslots: "main",
        gcmlimit: "max",
      },
    });

    if (!generatorResult || Object.keys(generatorResult).length === 0) {
      return null;
    }
    console.log(Object.values(generatorResult));


    return Object.fromEntries(
      Object.entries(generatorResult).map(([, page]) => [
        page.title,
        page?.revisions?.[0]?.slots?.main?.content ?? null,
      ])
    );
  } catch (error) {
    console.error(`Error getting content for "${category}":`, error.message);
    throw error;
  }
}


async function updatePage(pageTitle, newContent, editSummary, options = {}) {
  try {
    const { minor = false, bot = true } = options;

    return await hamiclolClient.edit({
      title: pageTitle,
      text: newContent,
      summary: editSummary,
      minor,
      bot,
    });
  } catch (error) {
    console.error(`Error updating "${pageTitle}":`, error.message);
    throw error;
  }
}

async function hendler() {
  const hamiclolLastUpdate = await getLastUpdateTimes(hamiclolClient);
  const wikiLastUpdate = await getLastUpdateTimes(wikipediaClient);
  const listOfUpdate = new Set();
  const categoresOfUpdate = {
    "יישובים": "תבניות בוט היישובים",
    "מדינות": "תבניות נתוני מדינות",
  };
  console.log(hamiclolLastUpdate);
  console.log(wikiLastUpdate);



  for (const key of Object.keys(hamiclolLastUpdate)) {
    console.info(`Comparing update times for ${key}: Hamichlol - ${hamiclolLastUpdate[key]}, Wikipedia - ${wikiLastUpdate[key]}`);
    if (hamiclolLastUpdate[key] > wikiLastUpdate[key]) {
      key.includes("בוט יישובים")
        ? listOfUpdate.add("יישובים")
        : listOfUpdate.add("מדינות");
    }
    if (listOfUpdate.size === 2) break;
  }
  if (listOfUpdate.size === 0) {
    console.log("No updates needed. Both templates are up to date.");
    return;
  }

  listOfUpdate.forEach(async (category) => {
    console.log(`Updating category: ${category}`);
    const contentForWikipedia = await getPagesContent(wikipediaClient, categoresOfUpdate[category]);
    const contentForHamichlol = await getPagesContent(hamiclolClient, categoresOfUpdate[category]);

    for (const [title, newContent] of Object.entries(contentForWikipedia)) {
      if (!newContent) {
        console.warn(`No content found for ${title}, skipping update.`);
        continue;
      }
      if (contentForHamichlol[title] === newContent) {
        console.log(`Content for ${title} is already up to date, skipping.`);
        continue;
      }
      const editSummary = `עדכון מוויקיפדיה לפי תאריך ${wikiTimes[title]}`;
      await updatePage(title, newContent, editSummary, { minor: false, bot: true });
      console.log(`Updated ${title} from Wikipedia.`);
    }
  });
}

hendler();
