// Helper functions for story upload functionality
import { apiCall, API_BASE_URL } from "../../config/api";

export interface StoryUploadData {
  content: string;
  media_type: "text" | "photo" | "video" | "music" | null;
  media_url?: string;
  duration_hours: number;
  background_color?: string;
  privacy: string;
  overlays?: any[];
}

export const uploadStoryMedia = async (
  file: File,
  userToken: string,
): Promise<string | null> => {
  if (!file) return null;

  console.log("🔥 Uploading story media file:", file.name);

  try {
    const formData = new FormData();
    formData.append("file", file);

    // Try different upload endpoints
    const response = await fetch(`${API_BASE_URL}/users/me/media`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Media upload successful:", data);
      return data.url || data.media_url || data.file_url;
    } else {
      console.error("❌ Media upload failed:", await response.text());
      return null;
    }
  } catch (error) {
    console.error("❌ Media upload error:", error);
    return null;
  }
};

export const createStoryWithFile = async (
  content: string,
  mediaFile: File | null,
  storyDuration: number,
  backgroundColor: string,
  privacy: string,
  userToken: string,
): Promise<boolean> => {
  console.log("🔥 Creating story with FormData approach...");

  try {
    let mediaUrl: string | null = null;
    let mediaType: "text" | "photo" | "video" | "music" | null = "text";

    // If there's a media file, upload it first
    if (mediaFile) {
      console.log("📤 Uploading media file...");

      // Upload the media file first
      mediaUrl = await uploadStoryMedia(mediaFile, userToken);

      if (!mediaUrl) {
        console.error("❌ Failed to upload media file");
        return false;
      }

      // Determine media type based on file
      if (mediaFile.type.startsWith("image/")) {
        mediaType = "photo";
      } else if (mediaFile.type.startsWith("video/")) {
        mediaType = "video";
      } else if (mediaFile.type.startsWith("audio/")) {
        mediaType = "music";
      }

      console.log("✅ Media uploaded successfully:", mediaUrl);
    }

    // Create story payload
    const payload: StoryUploadData = {
      content,
      media_type: mediaType,
      media_url: mediaUrl,
      duration_hours: storyDuration,
      background_color: backgroundColor,
      privacy,
      overlays: [],
    };

    console.log("📤 Creating story with payload:", payload);

    const response = await apiCall("/stories/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Story created successfully:", result);
      return true;
    } else {
      const errorData = await response.text();
      console.error("❌ Story creation failed:", errorData);
      console.error("Response status:", response.status);
      return false;
    }
  } catch (error) {
    console.error("❌ Story creation error:", error);
    return false;
  }
};
