import { Requests } from "../../requests/requests.js";

const wikipediaClient = new Requests({
  wikiUrl: "https://he.wikipedia.org/w/api.php",
  userAgent: "Bot Template Updater/1.0 (https://example.com/bot)",
});
const hamiclolClient = new Requests({
  wikiUrl: "https://www.hamichlol.org.il/w/api.php",
  userAgent: "Bot Template Updater/1.0 (https://example.com/bot)",
});

/**
 * Page Update Utilities
 *
 * Provides functions for common wiki page operations:
 * - Getting the last update timestamp of a page
 * - Fetching page content
 * - Updating page content with an edit summary
 *
 * These utilities are designed to work with the Requests API client
 * and follow MediaWiki API conventions.
 */

/**
 * Get the timestamp of the last update to a page
 *
 * @param {Requests} client - The Requests API client instance
 * @param {string} pageTitle - The title of the page to check
 * @returns {Promise<string|null>} ISO timestamp string of the last revision, or null if page not found
 *
 * @example
 * const lastUpdate = await getLastUpdateTime(client, 'תבנית:MyTemplate');
 * console.log(lastUpdate); // "2026-05-11T10:30:45Z"
 */
async function getLastUpdateTime(client) {
  const titles = ["תבנית:בוט יישובים/0026"];
  try {
    const queryResult = await client.queryPages({
      titles,
      options: {
        prop: "revisions",
        rvprop: "timestamp",
      },
    });

    if (!queryResult || Object.keys(queryResult).length === 0) {
      return null;
    }

    const page = Object.values(queryResult)[0];
    if (page.revisions && page.revisions.length > 0) {
      return page.revisions[0].timestamp;
    }

    return null;
  } catch (error) {
    console.error(`Error getting last update time for titles:`, error.message);
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
async function getPageContent(pageTitle) {
  try {
    const queryResult = await wikipediaClient.queryPages({
      titles: pageTitle,
      rvprop: "content",
      rvslots: "main",
    });

    if (!queryResult || Object.keys(queryResult).length === 0) {
      return null;
    }

    const page = Object.values(queryResult)[0];
    if (page.revisions && page.revisions.length > 0) {
      const slots = page.revisions[0].slots;
      if (slots && slots.main && slots.main.content) {
        return slots.main.content;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error getting content for "${pageTitle}":`, error.message);
    throw error;
  }
}

/**
 * Update a page with new content
 *
 * @param {string} pageTitle - The title of the page to update
 * @param {string} newContent - The new content for the page
 * @param {string} editSummary - The edit summary/reason for the change
 * @param {Object} [options={}] - Additional options
 * @param {boolean} [options.minor=false] - Mark the edit as minor
 * @param {boolean} [options.bot=true] - Mark the edit as a bot edit
 * @returns {Promise<Object>} The API response with edit information (includes pageid, title, contentmodel, etc.)
 *
 * @example
 * const result = await updatePage(
 *   client,
 *   'תבנית:MyTemplate',
 *   'new {{template}} content',
 *   'Update template structure',
 *   { minor: false, bot: true }
 * );
 * console.log(result); // { pageid: 123, title: 'תבנית:MyTemplate', contentmodel: 'wikitext', ... }
 */
async function updatePage(pageTitle, newContent, editSummary, options = {}) {
  try {
    const { minor = false, bot = true } = options;

    const result = await hamiclolClient.edit({
      title: pageTitle,
      text: newContent,
      summary: editSummary,
      minor,
      bot,
    });

    return result;
  } catch (error) {
    console.error(`Error updating "${pageTitle}":`, error.message);
    throw error;
  }
}

async function hendler() {
  const hamiclolLastUpdate = await getLastUpdateTime(hamiclolClient);
  const wikiLastUpdate = await getLastUpdateTime(wikipediaClient);
}
hendler();
