import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";

const UPLOAD_ROOT = "uploads/products";

// ensure upload folder exists
if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_ROOT),
  filename: (req, file, cb) => {
    const name = path.parse(file.originalname).name.replace(/\s+/g, "-");
    cb(null, `${name}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

function fileFilter(req, file, cb) {
  const allowed = /jpeg|jpg|png|webp|gif/i;
  if (allowed.test(path.extname(file.originalname))) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
}

export const uploadImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).array("images", 6); // up to 6 images per request

// Process images with sharp -> .webp and reasonable sizes
export async function processImages(files) {
  const processed = [];
  for (const file of files) {
    const base = path.parse(file.filename).name;
    const outputPath = path.join(UPLOAD_ROOT, `${base}.webp`);

    await sharp(file.path)
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outputPath);

    fs.unlinkSync(file.path); // remove original

    processed.push({
      url: `/${outputPath.replace(/\\/g, "/")}`,
      alt: "",
      isPrimary: false,
      providerPublicId: "",
    });
  }
  return processed;
}
