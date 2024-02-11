import ClientPhotos from "../../requests/Client_photos.js";

const clientPhotos = new ClientPhotos();

async function checkPhotos(arrPhoto) {
  const objPhotos = {};
  for (let photo of arrPhoto) {
    const res = await clientPhotos.search(photo);
    objPhotos[photo] = res.netfree;
  }
  return objPhotos;
}
export default checkPhotos;
