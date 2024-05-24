import { requests } from "../requests/requests.js";

const request = new requests("https://www.hamichlol.org.il/w/api.php");
const wikiApi = new requests("https://he.wikipedia.org/w/api.php");

async function redirectToDatePages() {
  const queryParams = {
    action: "query",
    format: "json",
    prop: "redirects",
    generator: "categorymembers",
    rdprop: "title",
    rdlimit: "max",
    gcmtitle: "קטגוריה:ימות השנה העברית",
    gcmtype: "page",
    gcmlimit: "max",
  };
  const TitlesEndRedirect = await wikiApi.queryPages({
    useIdsOrTitles: "titles",
    withCookie: false,
    options: queryParams,
  });
  const redirectsLocal = await request.queryPages({
    useIdsOrTitles: "titles",
    options: queryParams,
  });
  const listOfLocalRedirects = [];
  for (const title in redirectsLocal) {
    if (redirectsLocal[title].redirects) {
      for (const redirect of redirectsLocal[title].redirects) {
        listOfLocalRedirects.push(redirect.title);
      }
    }
  }
  for (const title in TitlesEndRedirect) {
    if (TitlesEndRedirect[title].redirects) {
      for (const redirect of TitlesEndRedirect[title].redirects) {
        if (
          listOfLocalRedirects.includes(redirect.title) ||
          redirect.title === title ||
          /המכלול/.test(redirect.title)
        )
          continue;
        try {
          const res = await request.edit({
            title: redirect.title,
            text: `#הפניה [[${title}]]`,
            tags: "importredirects-bot",
            nocreate: false,
            createonly: true,
          });
          console.log(res);
        } catch (error) {
          console.error(error);
        }
      }
    }
  }
}
redirectToDatePages();
