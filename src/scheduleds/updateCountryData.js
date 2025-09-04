import { getRequestsInstance } from "../requests/requests.js";
import logger from "../logger.js";

async function updateCountryData() {}

if (!process.env.AWS_EXECUTION_ENV) {
  // If not running in AWS Lambda, execute the function directly
  return await updateCountryData();
}

export const handler = async (event, context) => {
  return await updateCountryData();
};
