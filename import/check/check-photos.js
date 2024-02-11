import ClientPhotos from "../../requests/Client_photos.js";

const clientPhotos = new ClientPhotos();

/*
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

async function checkPhoto(photo) {
  const res = await clientPhotos.search(photo);
  return res.image.netfree || res.error.message;
}
function removePhoto(photo, text) {
  const regex = new RegExp(`[[${photo}]]`, "g");
  return text.replace(regex, "");
}
export default checkPhotos;
