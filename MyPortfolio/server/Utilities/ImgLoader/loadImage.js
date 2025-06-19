import { Image } from "canvas";
import https from "https";

const loadImage = (srcStartingFromServerFolder) => {
  const origin = process.env.SERVER_API_ORIGIN;

  const url = `${origin}/images/${srcStartingFromServerFolder}`

  // console.log("load image url: ", url);

  return new Promise((resolve, reject) => {
    https.get(url, {
      rejectUnauthorized: false
    }, (res) => {
      //image data
      const data = [];

      res.on("data", (chunk) => data.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(data);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = buffer;

        //console.log("image buffer: ", buffer);
      });
    }).on("error", reject);
  });
};

export default loadImage;