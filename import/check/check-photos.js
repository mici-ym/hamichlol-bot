import ClientPhotos from "../../requests/Client_photos.js";

const clientPhotos = new ClientPhotos();

/**
/* @param {Array} arrPhoto - An array of photos to check.
/* @param {string} wikitext - The wikitext of the page.
*/
async function checkPhotos(arrPhoto, wikitext) {
  const objPhotos = {
    text: wikitext,
    potoNoDB: false,
  };
  for (let photo of arrPhoto) {
    const check = await checkPhoto(photo);
    if (check === "blocked") {
      objPhotos.text = removePhoto(photo, wikitext);
    }
    if (check === "the image dosn't exist in data base") {
      objPhotos.potoNoDB = true;
    }
  }
  return objPhotos;
}
/**
 * Asynchronously checks if a photo exists in the database.
 *
 * @param {string} photo - The photo to be checked.
 * @returns {Promise<string>} - A promise that resolves to either the netfree image or an error message.
 */
async function checkPhoto(photo) {
  const res = await clientPhotos.search(photo);
  return res.image.netfree || res.error.message;
}
/**
 * Removes a photo from the given text.
 *
 * @param {string} photo - The photo to be removed.
 * @param {string} text - The text from which the photo should be removed.
 * @returns {string} - The updated text with the photo removed.
 */
function removePhoto(photo, text) {
  const regex = new RegExp(`[[${photo}]]`, "g");
  return text.replace(regex, "");
}
export default checkPhotos;
