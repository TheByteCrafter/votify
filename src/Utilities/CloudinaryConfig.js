export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "convoy_meet");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/dsqfbbf6m/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();
  return data.secure_url;
}
