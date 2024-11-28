import { getRequestsInstance } from "../requests/requests.js";
import logger from "../logger.js";

const request = getRequestsInstance();

async function rollback() {
  const userRollback = process.argv[2];
  if (!userRollback) {
    logger.error("No user provided for rollback.");
    process.exit(1);
  }
  const limit = process.argv[3] || "max";
  const paramsRollback = {
    list: "usercontribs",
    formatversion: "2",
    uclimit: limit,
    ucuser: userRollback,
    ucnamespace: 0,
    ucshow: "top",
    ucprop: "ids|title",
  };
  console.log(paramsRollback);

  const {
    query: { usercontribs },
  } = await request.query({ options: paramsRollback, getContinue: false });
  if (usercontribs.length === 0) {
    logger.info("No user contributions found.");
    process.exit(0);
  }
  logger.info(
    `Found ${usercontribs.length} user contributions for ${userRollback}.`
  );

  for (const page of usercontribs) {
    const { title } = page;
    try {
      await request
        .rollback(userRollback, { title })
        .then((data) => logger.info(`Rollbacked page: ${title}`, data));
    } catch (error) {
      logger.error("rollback failed for page:", title, error);
    }
  }
  request.logout();
}

rollback();
export default rollback;
