const axios = require("axios");

const uploadToImageBB = async (files, key) => {
  try {
    const fileArray = Array.isArray(files) ? files : [files];

    const uploadedImages = [];

    for (const file of fileArray) {
      const formData = new URLSearchParams();
      formData.append("key", key);
      formData.append("image", file.toString("base64"));

      const response = await axios.post(
        "https://api.imgbb.com/1/upload",
        formData,
      );

      uploadedImages.push(response.data.data.url);
    }

    return Array.isArray(files) ? uploadedImages : uploadedImages[0];
  } catch (error) {
    throw new Error("ImageBB Upload Failed: " + error.message);
  }
};

module.exports = uploadToImageBB;
