import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

const router: IRouter = Router();

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME_PREFIXES = ["image/", "video/"];
const ALLOWED_MIME_TYPES = new Set(["application/pdf"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowed =
      ALLOWED_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix)) ||
      ALLOWED_MIME_TYPES.has(file.mimetype);

    if (!allowed) {
      cb(new Error("Only images, videos, and PDF files are allowed"));
      return;
    }

    cb(null, true);
  },
});

let cloudinaryConfigured = false;

function ensureCloudinaryConfigured() {
  if (cloudinaryConfigured) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary environment variables are missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  cloudinaryConfigured = true;
}

function uploadBufferToCloudinary(file: Express.Multer.File) {
  ensureCloudinaryConfigured();

  return new Promise<{
    secure_url: string;
    public_id: string;
    resource_type: string;
    format?: string;
    bytes: number;
  }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "unisphere/uploads",
        resource_type: "auto",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          format: result.format,
          bytes: result.bytes,
        });
      },
    );

    stream.end(file.buffer);
  });
}

/**
 * POST /storage/uploads
 *
 * Upload a media file to Cloudinary through the API server.
 * The frontend sends multipart/form-data with a single field named "file".
 * The response keeps the old shape used by the frontend upload hook.
 */
router.post("/storage/uploads", (req: Request, res: Response) => {
  upload.single("file")(req, res, async (uploadError: unknown) => {
    if (uploadError) {
      req.log.warn({ err: uploadError }, "Upload rejected");
      res.status(400).json({ error: uploadError instanceof Error ? uploadError.message : "Invalid upload" });
      return;
    }

    try {
      if (!req.file) {
        res.status(400).json({ error: "Missing file" });
        return;
      }

      const result = await uploadBufferToCloudinary(req.file);

      res.json({
        uploadURL: result.secure_url,
        objectPath: result.secure_url,
        metadata: {
          name: req.file.originalname,
          size: req.file.size,
          contentType: req.file.mimetype,
          cloudinaryPublicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format,
          bytes: result.bytes,
        },
      });
    } catch (error) {
      req.log.error({ err: error }, "Cloudinary upload failed");
      res.status(500).json({ error: "Failed to upload file" });
    }
  });
});

/**
 * Legacy endpoint kept only to make old generated clients fail clearly.
 * The frontend now uses POST /storage/uploads instead of Replit signed URLs.
 */
router.post("/storage/uploads/request-url", (_req: Request, res: Response) => {
  res.status(410).json({
    error: "Replit Object Storage signed URLs have been replaced by Cloudinary uploads.",
  });
});

export default router;
