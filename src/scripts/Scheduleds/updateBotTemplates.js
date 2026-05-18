import { Requests } from "../../requests/requests.js";

const wikipediaClient = new Requests({
  wikiUrl: "https://he.wikipedia.org/w/api.php",
  userAgent: "Bot Template Updater/1.0 (https://example.com/bot)",
});
const hamiclolClient = new Requests({
  wikiUrl: "https://www.hamichlol.org.il/w/api.php",
  userAgent: "Bot Template Updater/1.0 (https://example.com/bot)",
});

const TITLES = [
  "תבנית:בוט יישובים/0026",
  "תבנית:בוט מדינות/0026",
];

async function getLastUpdateTimes(client, titles) {
  try {
    const queryResult = await client.queryPages({
      titles,
      useIdsOrTitles: "titles",
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
        page?.revisions?.[0]?.timestamp ?? null,
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
        prop: "revisions",
        rvprop: "content",
        rvslots: "main",
      },
    });

    if (!generatorResult || Object.keys(generatorResult).length === 0) {
      return null;
    }

    return Object.fromEntries(
      Object.entries(queryResult).map(([title, page]) => [
        title,
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
  const hamiclolLastUpdate = await getLastUpdateTime(hamiclolClient);
  const wikiLastUpdate = await getLastUpdateTime(wikipediaClient);
  const listOfUpdate = new Set();

  for (const key in Object.keys(hamiclolLastUpdate)) {
    if (hamiclolLastUpdate[key] > wikiLastUpdate[key]) {
      hamiclolLastUpdate[key].includes("בוט יישובים")
        ? listOfUpdate.add("יישובים")
        : listOfUpdate.add("מדינות");
    }
    if (listOfUpdate.size === 2) break;
  }
  if (listOfUpdate.size === 0) {
    console.log("No updates needed. Both templates are up to date.");
    return;
  }

  const contentByTitle = await getPagesContent(wikipediaClient, titlesToUpdate);

  for (const title of titlesToUpdate) {
    const newContent = contentByTitle[title];
    if (!newContent) {
      console.warn(`No content found for ${title}, skipping update.`);
      continue;
    }
    const editSummary = `עדכון מוויקיפדיה לפי תאריך ${wikiTimes[title]}`;
    await updatePage(title, newContent, editSummary, { minor: false, bot: true });
    console.log(`Updated ${title} from Wikipedia.`);
  }
}

handler();
