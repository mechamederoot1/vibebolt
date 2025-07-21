import React, { useState, useEffect } from "react";
import { ResponsiveCreatePostModal } from "./modals/ResponsiveCreatePostModal";
import { ResponsiveCreateStoryModal } from "./modals/ResponsiveCreateStoryModal";
import { PostCard } from "./posts/PostCard";
import { EnhancedStoriesBar } from "./stories/EnhancedStoriesBar";
import { createStoryWithFile } from "./stories/StoryUploadHelper";

// Global function type declaration
declare global {
  interface Window {
    refreshProfilePosts?: () => void;
  }
}

interface FeedProps {
  user: {
    id?: number;
    name: string;
    email: string;
    avatar?: string;
    token: string;
  };
}

interface Post {
  id: number;
  author: {
    id: number;
    first_name: string;
    last_name: string;
    avatar?: string;
  };
  content: string;
  post_type: "post" | "testimonial";
  media_type?: string;
  media_url?: string;
  created_at: string;
  reactions_count: number;
  comments_count: number;
  shares_count: number;
  is_profile_update?: boolean;
  is_cover_update?: boolean;
}

export const Feed: React.FC<FeedProps> = ({ user }) => {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storyRefreshTrigger, setStoryRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchPosts();
  }, [user.token]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("http://localhost:8000/posts/", {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(
          data.map((post: any) => ({
            ...post,
            author: {
              ...post.author,
              name: `${post.author.first_name} ${post.author.last_name}`,
            },
          })),
        );
      } else if (response.status === 401) {
        setError("Sessão expirada. Faça login novamente.");
      } else {
        setError("Erro ao carregar posts");
      }
    } catch (error) {
      console.error("Erro ao carregar posts:", error);
      setError("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (
    content: string,
    type: "post" | "testimonial",
    privacy: string,
    mediaData?: any,
  ) => {
    try {
      let payload: any = {
        content,
        post_type: type,
        privacy: privacy,
      };

      // Handle multiple media files
      if (mediaData && mediaData.urls && mediaData.urls.length > 0) {
        if (mediaData.urls.length === 1) {
          // Single media file
          payload.media_type = mediaData.types[0];
          payload.media_url = mediaData.urls[0];
        } else {
          // Multiple media files - store as JSON metadata
          payload.media_type = "multiple";
          payload.media_metadata = JSON.stringify({
            files: mediaData.urls.map((url: string, index: number) => ({
              url,
              type: mediaData.types[index],
            })),
            count: mediaData.count,
          });
        }
      }

      const response = await fetch("http://localhost:8000/posts/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const postData = await response.json();
        console.log("✅ Post/Testimonial created successfully:", postData);
        console.log("🔄 Refreshing feeds...");

        fetchPosts();
        setShowCreatePost(false);

        // Refresh profile posts if user is on profile page
        if (
          window.refreshProfilePosts &&
          typeof window.refreshProfilePosts === "function"
        ) {
          console.log("🔄 Calling profile posts refresh...");
          setTimeout(() => {
            window.refreshProfilePosts!();
          }, 500); // Small delay to ensure backend has processed
        } else {
          console.log(
            "ℹ️ Profile refresh function not available (user not on profile page)",
          );
        }

        // Show success message
        if (type === "testimonial") {
          alert("🎉 Depoimento criado com sucesso!");
        } else {
          alert("🎉 Post criado com sucesso!");
        }
      } else {
        const error = await response.json();
        console.error("Erro ao criar post:", error);
        alert("Erro ao criar post: " + (error.detail || "Erro desconhecido"));
      }
    } catch (error) {
      console.error("Erro ao criar publicação:", error);
      alert("Erro ao criar publicação");
    }
  };

  const handleCreateStory = async (
    content: string,
    mediaData?: any,
    storyDuration?: number,
    backgroundColor?: string,
    privacy?: string,
    overlays?: any[],
  ) => {
    console.log("🔥 Feed handleCreateStory called with:", {
      content,
      mediaData,
      storyDuration,
      backgroundColor,
    });

    try {
      // Extract the actual file from mediaData if present
      const mediaFile = mediaData?.file || null;

      const success = await createStoryWithFile(
        content,
        mediaFile,
        storyDuration || 24,
        backgroundColor || "#3B82F6",
        privacy || "public",
        user.token,
      );

      if (success) {
        console.log("✅ Story created successfully!");
        alert("🎉 Story criado com sucesso!");
        // Trigger immediate refresh of stories
        setStoryRefreshTrigger((prev) => prev + 1);
        setShowCreateStory(false);
      } else {
        console.error("❌ Failed to create story");
        alert("❌ Erro ao criar story. Tente novamente.");
      }
    } catch (error) {
      console.error("❌ Error creating story:", error);
      alert("❌ Erro ao criar story. Tente novamente.");
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchPosts}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stories Bar */}
      <EnhancedStoriesBar
        userToken={user.token}
        onCreateStory={() => setShowCreateStory(true)}
        currentUser={user}
        refreshTrigger={storyRefreshTrigger}
      />

      {/* Create Post */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center space-x-4">
          <img
            src={
              user.avatar ||
              `https://ui-avatars.com/api/?name=${user.name}&background=3B82F6&color=fff`
            }
            alt={user.name}
            className="w-12 h-12 rounded-full"
          />
          <button
            onClick={() => setShowCreatePost(true)}
            className="flex-1 text-left p-4 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors"
          >
            No que você está pensando, {user.name.split(" ")[0]}?
          </button>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-slate-500 text-lg">Nenhum post ainda.</p>
            <p className="text-slate-400 mt-2">
              Seja o primeiro a compartilhar algo!
            </p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              userToken={user.token}
              onPostDeleted={fetchPosts}
            />
          ))
        )}
      </div>

      {/* Create Post Modal */}
      <ResponsiveCreatePostModal
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onSubmit={handleCreatePost}
        userToken={user.token}
      />

      {/* Create Story Modal */}
      <ResponsiveCreateStoryModal
        isOpen={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onSubmit={handleCreateStory}
      />
    </div>
  );
};
