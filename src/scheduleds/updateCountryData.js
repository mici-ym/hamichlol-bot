import { getRequestsInstance } from "../requests/requests.js";
import localLogger from "../logger.js";

// Configure logger based on environment
const logger = process.env.AWS_EXECUTION_ENV
  ? {
      info: (message, extra) => console.log(`[INFO] ${message}`, extra || ""),
      error: (message, extra) =>
        console.error(`[ERROR] ${message}`, extra || ""),
      warn: (message, extra) => console.warn(`[WARN] ${message}`, extra || ""),
      debug: (message, extra) =>
        console.debug(`[DEBUG] ${message}`, extra || ""),
    }
  : localLogger;

// Helper functions
function validateEnvironmentVariables() {
  const wlowner = process.env.WIKIPEDIA_WL_OWNER;
  const wltoken = process.env.WIKIPEDIA_WL_TOKEN;

  if (!wlowner || !wltoken) {
    throw new Error(
      "WIKIPEDIA_WL_OWNER and WIKIPEDIA_WL_TOKEN must be defined in environment variables"
    );
  }

  return { wlowner, wltoken };
}

function createWatchListParams(wlowner, wltoken) {
  return {
    list: "watchlist",
    formatversion: "2",
    wlprop: "ids|title|flags|tags|timestamp",
    wlshow: "bot",
    wlowner,
    wltoken,
  };
}

function filterCountryUpdates(watchlist) {
  const countryUpdates = new Set();
  watchlist.forEach((item) => {
    if (
      item.title.startsWith("תבנית:נתוני מדינות/") &&
      !item.tags.includes("mw-manual-revert")
    ) {
      countryUpdates.add(item.title);
    }
  });
  return countryUpdates;
}

function createTemplatesQueryParams() {
  return {
    prop: "revisions",
    generator: "categorymembers",
    formatversion: "2",
    rvprop: "content",
    rvslots: "main",
    gcmtitle: "קטגוריה:תבניות נתוני מדינות",
    gcmnamespace: "max",
  };
}

async function updateTemplates(hamichlol, templatesData) {
  for (const [, template] of Object.entries(templatesData)) {
    const title = template.title;
    const content = template.revisions[0].slots.main.content["*"];

    try {
      const { edit, error } = await hamichlol.edit({
        title,
        text: content,
        summary: "עדכון נתוני מדינות",
        tags: "auto-update",
      });

      if (edit) {
        logger.info(`Successfully updated ${title}`, edit);
      } else {
        logger.error(`Failed to update ${title}:`, error);
      }
    } catch (editError) {
      logger.error(`Error updating ${title}: ${editError.message}`, editError);
    }
  }
}

async function countCountriesToUpdate(hamichlol, countryTitles, watchlist) {
  const timestampsHamichlol = await hamichlol.queryPages({
    titles: Array.from(countryTitles),
    options: {
      prop: "revisions",
      formatversion: "2",
      rvprop: "timestamp",
    },
  });

  let countriesToUpdate = 0;
  for (const page of timestampsHamichlol) {
    if (page.revisions && page.revisions.length > 0) {
      const hamichlolDate = new Date(page.revisions[0].timestamp);
      const wikipediaItem = watchlist.find((item) => item.title === page.title);
      const wikipediaDate = new Date(wikipediaItem.timestamp);

      if (wikipediaDate > hamichlolDate) {
        countriesToUpdate++;
      }
    }
  }

  return countriesToUpdate;
}

async function updateCountryData(skipWatchlistCheck = false) {
  const hamichlol = getRequestsInstance("hamichlol");
  const wikipedia = getRequestsInstance("wikipedia");
  wikipedia.withLogedIn = false;

  try {
    if (!skipWatchlistCheck) {
      // Validate environment variables
      const { wlowner, wltoken } = validateEnvironmentVariables();

      // Get watchlist from Wikipedia
      const watchListParams = createWatchListParams(wlowner, wltoken);
      const { value: watchlist } = await wikipedia
        .query({ options: watchListParams })
        .next();

      // Filter country updates
      const countryUpdates = filterCountryUpdates(watchlist);

      if (countryUpdates.size === 0) {
        logger.info("No country data updates found in the watchlist.");
        return;
      }

      if (countryUpdates.size < 3) {
        logger.info("Fewer than 3 country data updates found.");
        return;
      }

      logger.info("3 or more country data updates found, processing all.");

      // Count countries that need updating
      const countriesToUpdate = await countCountriesToUpdate(
        hamichlol,
        countryUpdates,
        watchlist
      );

      if (countriesToUpdate === 0) {
        logger.info("No countries to update.");
        return;
      }

      logger.info(`${countriesToUpdate} countries to update.`);
    }
    // Get templates data and update
    const queryParams = createTemplatesQueryParams();
    const templatesData = await wikipedia.query(queryParams);
    await updateTemplates(hamichlol, templatesData);

    logger.info("Country data update process completed.");
    hamichlol.logout();
  } catch (error) {
    logger.error(`Failed to update country data: ${error.message}`, error);
  }
}

if (!process.env.AWS_EXECUTION_ENV) {
  // If not running in AWS Lambda, execute the function directly
  updateCountryData(true);
}

export const handler = async (event, context) => {
  return await updateCountryData();
};
