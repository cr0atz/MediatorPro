import { promises as fs } from "fs";
import path from "path";
import { Response } from "express";
import { randomUUID } from "crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const DOCUMENTS_DIR = path.join(UPLOAD_DIR, "documents");
const TEMP_DIR = path.join(UPLOAD_DIR, "temp");
const ACL_DIR = path.join(UPLOAD_DIR, ".acl");

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

interface FileMetadata {
  contentType: string;
  size: number;
  uploadedAt: string;
  userId?: string;
}

interface AclPolicy {
  visibility?: "public" | "private";
  allowedUsers?: string[];
  owner?: string;
}

// Local file storage service for self-hosted deployments
export class LocalFileStorageService {
  constructor() {
    this.ensureDirectories();
  }

  // Ensure required directories exist
  private async ensureDirectories() {
    try {
      await fs.mkdir(DOCUMENTS_DIR, { recursive: true });
      await fs.mkdir(TEMP_DIR, { recursive: true });
      await fs.mkdir(ACL_DIR, { recursive: true });
    } catch (error) {
      console.error("Error creating directories:", error);
    }
  }

  // Generate a unique file path for upload
  async getUploadPath(originalFileName?: string): Promise<string> {
    const fileId = randomUUID();
    const ext = originalFileName ? path.extname(originalFileName) : '';
    const fileName = `${fileId}${ext}`;
    return path.join(DOCUMENTS_DIR, fileName);
  }

  // Save file to local storage
  async saveFile(
    buffer: Buffer,
    metadata: FileMetadata,
    userId?: string
  ): Promise<string> {
    const filePath = await this.getUploadPath();
    const fileId = path.basename(filePath);
    
    // Save file
    await fs.writeFile(filePath, buffer);

    // Save metadata and ACL
    const aclPath = path.join(ACL_DIR, `${fileId}.json`);
    const aclData: AclPolicy & FileMetadata = {
      ...metadata,
      visibility: "private",
      owner: userId,
      allowedUsers: userId ? [userId] : [],
    };
    await fs.writeFile(aclPath, JSON.stringify(aclData, null, 2));

    // Return normalized path in /objects/ format for compatibility
    return `/objects/${fileId}`;
  }

  // Get file path from object path
  private getFilePathFromObjectPath(objectPath: string): string {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const fileId = objectPath.replace("/objects/", "");
    return path.join(DOCUMENTS_DIR, fileId);
  }

  // Get ACL path from file ID
  private getAclPath(fileId: string): string {
    return path.join(ACL_DIR, `${fileId}.json`);
  }

  // Check if file exists
  async fileExists(objectPath: string): Promise<boolean> {
    try {
      const filePath = this.getFilePathFromObjectPath(objectPath);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // Get file metadata and ACL
  private async getFileMetadata(fileId: string): Promise<(AclPolicy & FileMetadata) | null> {
    try {
      const aclPath = this.getAclPath(fileId);
      const aclData = await fs.readFile(aclPath, 'utf-8');
      return JSON.parse(aclData);
    } catch {
      return null;
    }
  }

  // Set ACL policy for a file
  async setAclPolicy(objectPath: string, aclPolicy: AclPolicy): Promise<void> {
    const fileId = objectPath.replace("/objects/", "");
    const aclPath = this.getAclPath(fileId);
    
    // Read existing metadata
    const existing = await this.getFileMetadata(fileId) || {
      contentType: 'application/octet-stream',
      size: 0,
      uploadedAt: new Date().toISOString(),
    };

    // Merge with new ACL policy
    const updated = {
      ...existing,
      ...aclPolicy,
    };

    await fs.writeFile(aclPath, JSON.stringify(updated, null, 2));
  }

  // Check if user can access file
  async canAccessFile(
    objectPath: string,
    userId?: string,
    requestedPermission: "read" | "write" = "read"
  ): Promise<boolean> {
    const fileId = objectPath.replace("/objects/", "");
    const metadata = await this.getFileMetadata(fileId);

    if (!metadata) {
      // No ACL means private, deny access
      return false;
    }

    // Public files are accessible to everyone
    if (metadata.visibility === "public") {
      return true;
    }

    // No user ID means not authenticated, deny for private files
    if (!userId) {
      return false;
    }

    // Owner always has access
    if (metadata.owner === userId) {
      return true;
    }

    // Check allowed users
    if (metadata.allowedUsers && metadata.allowedUsers.includes(userId)) {
      return true;
    }

    return false;
  }

  // Download file and stream to response
  async downloadFile(objectPath: string, res: Response, cacheTtlSec: number = 3600) {
    try {
      const filePath = this.getFilePathFromObjectPath(objectPath);
      const fileId = path.basename(filePath);
      
      // Check if file exists
      const exists = await this.fileExists(objectPath);
      if (!exists) {
        throw new ObjectNotFoundError();
      }

      // Get file stats and metadata
      const stats = await fs.stat(filePath);
      const metadata = await this.getFileMetadata(fileId);

      const contentType = metadata?.contentType || 'application/octet-stream';
      const isPublic = metadata?.visibility === "public";

      // Set headers
      res.set({
        "Content-Type": contentType,
        "Content-Length": stats.size.toString(),
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      });

      // Stream file to response
      const fileStream = await fs.readFile(filePath);
      res.send(fileStream);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (error instanceof ObjectNotFoundError) {
        throw error;
      }
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Delete file and its metadata
  async deleteFile(objectPath: string): Promise<void> {
    const filePath = this.getFilePathFromObjectPath(objectPath);
    const fileId = path.basename(filePath);
    const aclPath = this.getAclPath(fileId);

    try {
      await fs.unlink(filePath);
      await fs.unlink(aclPath).catch(() => {}); // Ignore if ACL doesn't exist
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  }

  // Normalize object path (for compatibility with GCS paths)
  normalizeObjectEntityPath(rawPath: string): string {
    // If already in /objects/ format, return as-is
    if (rawPath.startsWith("/objects/")) {
      return rawPath;
    }

    // If it's a full URL (for backward compatibility with GCS URLs)
    if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
      try {
        const url = new URL(rawPath);
        const pathname = url.pathname;
        if (pathname.startsWith("/objects/")) {
          return pathname;
        }
      } catch {
        // Invalid URL, fall through
      }
    }

    // Return as-is for other paths
    return rawPath;
  }

  // Upload URL generation (for compatibility - returns local upload endpoint)
  async getObjectEntityUploadURL(): Promise<string> {
    // For local storage, we don't use presigned URLs
    // This method is kept for API compatibility
    // The actual upload will be handled by the multer middleware
    return "/api/documents/upload-local";
  }
}
