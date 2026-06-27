import { useState, useCallback } from "react";
import type { UppyFile } from "@uppy/core";

interface UploadMetadata {
  name: string;
  size: number;
  contentType: string;
}

interface UploadResponse {
  uploadURL: string;
  objectPath: string;
  metadata: UploadMetadata;
}

interface UseUploadOptions {
  /** Base path where object storage routes are mounted (default: "/api/storage") */
  basePath?: string;
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * React hook for handling file uploads.
 *
 * The previous implementation requested Replit Object Storage signed URLs.
 * The current implementation sends multipart/form-data to the API server,
 * and the API server uploads the file to Cloudinary using server-side secrets.
 */
export function useUpload(options: UseUploadOptions = {}) {
  const basePath = options.basePath ?? "/api/storage";
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState(0);

  const uploadToBackend = useCallback(
    async (file: File): Promise<UploadResponse> => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${basePath}/uploads`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to upload file");
      }

      return response.json();
    },
    [basePath],
  );

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResponse | null> => {
      setIsUploading(true);
      setError(null);
      setProgress(0);

      try {
        setProgress(30);
        const uploadResponse = await uploadToBackend(file);

        setProgress(100);
        options.onSuccess?.(uploadResponse);
        return uploadResponse;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed");
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [uploadToBackend, options],
  );

  const getUploadParameters = useCallback(
    async (
      _file: UppyFile<Record<string, unknown>, Record<string, unknown>>,
    ): Promise<{
      method: "PUT";
      url: string;
      headers?: Record<string, string>;
    }> => {
      throw new Error(
        "ObjectUploader still expects signed PUT URLs. Use uploadFile() for Cloudinary uploads, or migrate ObjectUploader separately.",
      );
    },
    [],
  );

  return {
    uploadFile,
    getUploadParameters,
    isUploading,
    error,
    progress,
  };
}
