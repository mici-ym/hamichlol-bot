/**
 * Retrieves the value of the "wikibase_item" property from the given data object.
 * If the property does not exist, an empty string is returned.
 * @param {Array} properties - The input data object containing the properties to be checked.
 * @param {string} type - The type of property to check for.
 * @returns {string} - The value of the "wikibase_item" property, or an empty string if it doesn't exist.
 */
function getProperties(properties, type) {
  // Check if properties exist and if the length is greater than 0
  if (!properties || properties.length < 1) return "";

  // Iterate over the properties
  for (const property of properties) {
    // Check if the property name is "wikibase_item"
    if (property.name == type) {
      // Return the value of the property if found
      return property["*"];
    }
  }

  // Return an empty string if the wikibase item is not found
  return "";
}

/**
 * Processes wiki content and prepares it for import/update with templates and metadata
 * @param {Object} wikiContent - The wiki content object containing title, revid and properties
 * @param {string} wikiContent.text - The wiki content
 * @param {string} wikiContent.title - The title of the wiki content
 * @param {number} wikiContent.revid
 * @param {Array<object} wikiContent.properties
 * @param {Object} options - Configuration options object
 * @param {string} options.currentPage - Current page being processed
 * @param {string} options.page - Target page name
 * @param {string} options.bot - Bot name if running in bot mode
 * @param {boolean} options.exist - Whether page already exists
 * @param {number|null} options.sectionNum - Section number being edited
 * @param {string} options.sectionTitle - Title of section being edited
 * @returns {Object} Object containing processed text and edit summary
 */
function processWikiContent(wikiContent, options) {
  const { currentPage, bot, exist, sectionNum, sectionTitle } = options;
  const { title: page } = wikiContent;

  const dataPage = {
    דף: wikiContent.title,
    גרסה: wikiContent.revid,
    פריט: getProperties(wikiContent.properties, "wikibase_item"),
    תאריך: `${new Date().toLocaleString("he", {
      month: "long",
    })} ${new Date().getFullYear()}`,
  };

  const credit = currentPage === page ? "{{וח}}" : `{{וח|${page}}}`;
  const sortWiki =
    Object.entries(dataPage).reduce(
      (acc, [key, value]) => (value ? `${acc}|${key}=${value}` : acc),
      "{{מיון ויקיפדיה"
    ) + "}}";

  let text = wikiContent.text;
  if (bot) {
    const tionary = require("./mw-import-tionary.js");
    text = tionary(wikiContent, bot);
  }
  const replacementResult = applyReplacements(text);
  text = replacementResult.text;
  const redirect = /#הפניה|#REDIRECT/.test(text);
  const isMainNamespace = !page.includes(":");
  const shouldAddTemplates =
    isMainNamespace && !redirect && !bot && sectionNum === undefined;

  if (shouldAddTemplates) {
    text += `\n${credit}\n${sortWiki}`;
  } else if (bot) {
    text += `\n${sortWiki}`;
  }

  const baseMessage = exist
    ? `עדכון מוויקיפדיה גרסה ${dataPage["גרסה"]}`
    : "ייבוא מוויקיפדיה העברית, ראה רשימת התורמים";
  const botSuffix = bot ? `, בוט ${bot}` : "";
  const sectionPrefix =
    sectionNum !== undefined ? `/* ${sectionTitle || "פתיח"} */ ` : "";
  let summary =
    sectionPrefix +
    (sectionNum !== undefined
      ? baseMessage.replace("עדכון", "עדכון פסקה")
      : baseMessage) +
    botSuffix;
  summary += replacementResult.hasReplacements ? ", החלפות אוטומטיות" : "";

  return { text, summary };
}

/**
 * Performs text replacements based on JSON configuration
 * @param {string} text - The text to perform replacements on
 * @param {string} summary - The summary to append replacement indicator to
 * @param {Array} replacements - Array of {from, to} replacement objects
 * @returns {Object} - {text, summary} with replacements applied and editorial summary
 */
function applyReplacements(text, replacements = []) {
  console.time("replace");
  const defaultReplacements = import("https://www.hamichlol.org.il/w/index.php?title=%D7%9E%D7%93%D7%99%D7%94_%D7%95%D7%99%D7%A7%D7%99:mw-import-replacements.json&action=raw", { with: { type: "json" } });
  const allReplacements = [...defaultReplacements, ...replacements];
  let hasReplacements = false;
  for (const { from, to } of allReplacements) {
    const regex = new RegExp(from, "gi");
    if (regex.test(text)) {
      text = text.replace(regex, to);
      hasReplacements = true;
      console.log(from);
    }
  }
  console.timeEnd("replace");
  return {
    text,
    hasReplacements,
  };
}

export { getProperties, processWikiContent, applyReplacements };
