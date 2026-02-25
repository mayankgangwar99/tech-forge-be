import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";

if (process.env.CLOUDINARY_URL && !process.env.CLOUDINARY_URL.startsWith("cloudinary://")) {
  delete process.env.CLOUDINARY_URL;
}

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export { cloudinary };
