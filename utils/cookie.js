/**
 *
 * @param {String[]} cookie
 * @returns
 */
export function extractCookie(cookie) {
  if (!cookie?.length) return "";
  if (typeof cookie === "string") return cookie;
  return cookie
    .map((entry) => {
      const parts = entry.split(";");
      const cookiePart = parts[0];
      return cookiePart;
    })
    .join(";");
}
