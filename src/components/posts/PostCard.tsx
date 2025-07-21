import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Share,
  MoreHorizontal,
  Trash2,
  Send,
  ExternalLink,
} from "lucide-react";
import { FacebookReactionButton } from "./FacebookReactionButton";
import { EnhancedReactionDisplay } from "./EnhancedReactionDisplay";
import { CustomReactionEmoji } from "./CustomReactionEmojis";

interface PostCardProps {
  post: {
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
  };
  userToken: string;
  onPostDeleted: () => void;
  hideComments?: boolean; // Nova prop para esconder seção de comentários
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  userToken,
  onPostDeleted,
  hideComments = false,
}) => {
  const navigate = useNavigate();
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showEnhancedReactionPicker, setShowEnhancedReactionPicker] =
    useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [currentReaction, setCurrentReaction] = useState<string | null>(null);
  const [isLoved, setIsLoved] = useState(false);
  const [reactionCounts, setReactionCounts] = useState<any>({});
  const [loveCount, setLoveCount] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetchReactions();
    fetchComments();

    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const fetchReactions = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/reactions/post/${post.id}`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setReactionCounts(data.reactions || {});

        // Separar like de amei
        if (data.user_reaction === "like") {
          setCurrentReaction("like");
        } else if (data.user_reaction === "amei") {
          setIsLoved(true);
        } else {
          setCurrentReaction(data.user_reaction);
        }

        setLoveCount(data.reactions?.amei || 0);
      }
    } catch (error) {
      console.error("Erro ao carregar reações:", error);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/comments/post/${post.id}`,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Erro ao carregar comentários:", error);
    }
  };

  const handleReaction = async (reactionType: string) => {
    try {
      const response = await fetch("http://localhost:8000/reactions/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_id: parseInt(post.id),
          reaction_type: reactionType,
        }),
      });

      if (response.ok) {
        // Atualizar estado local baseado no tipo de reação
        if (reactionType === "like") {
          setCurrentReaction(currentReaction === "like" ? null : "like");
        } else if (reactionType === "amei") {
          setIsLoved(!isLoved);
          setLoveCount((prev) => (isLoved ? prev - 1 : prev + 1));
        } else {
          setCurrentReaction(
            currentReaction === reactionType ? null : reactionType,
          );
        }

        fetchReactions();
        setShowReactionPicker(false);
      }
    } catch (error) {
      console.error("Erro ao reagir:", error);
    }
  };

  const handleLoveToggle = () => {
    handleReaction("amei");
  };

  const handleEnhancedReaction = async (reactionType: string) => {
    try {
      const response = await fetch("http://localhost:8000/reactions/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          post_id: post.id,
          reaction_type: reactionType,
        }),
      });

      if (response.ok) {
        // Refresh reactions will be handled by EnhancedReactionDisplay
        setShowEnhancedReactionPicker(false);
      }
    } catch (error) {
      console.error("Error with enhanced reaction:", error);
    }
  };
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoadingComment(true);
    try {
      const response = await fetch("http://localhost:8000/comments/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newComment,
          post_id: parseInt(post.id),
        }),
      });

      if (response.ok) {
        setNewComment("");
        await fetchComments();
      }
    } catch (error) {
      console.error("Erro ao enviar comentário:", error);
    } finally {
      setLoadingComment(false);
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("Tem certeza que deseja excluir este post?")) return;

    try {
      const response = await fetch(`http://localhost:8000/posts/${post.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (response.ok) {
        onPostDeleted();
      }
    } catch (error) {
      console.error("Erro ao excluir post:", error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "agora";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const renderContent = () => {
    if (post.post_type === "testimonial") {
      try {
        const testimonialData = JSON.parse(post.content);
        return (
          <div
            className="p-6 rounded-lg my-4"
            style={{
              fontSize: testimonialData.styles?.fontSize || "16px",
              fontWeight: testimonialData.styles?.fontWeight || "normal",
              color: testimonialData.styles?.color || "#000000",
              backgroundColor:
                testimonialData.styles?.backgroundColor || "#ffffff",
              fontFamily: testimonialData.styles?.fontFamily || "Arial",
              textShadow: testimonialData.styles?.textShadow || "none",
              whiteSpace: "pre-line", // Para manter quebras de linha
            }}
            dangerouslySetInnerHTML={{ __html: testimonialData.content }}
          />
        );
      } catch (e) {
        console.error("Error parsing testimonial:", e);
        return <p className="text-gray-900 leading-relaxed">{post.content}</p>;
      }
    }

    return (
      <p className="text-gray-900 leading-relaxed whitespace-pre-line">
        {post.content}
      </p>
    );
  };

  const handleLongPress = () => {
    setShowReactionPicker(true);
  };

  const totalReactions = Object.values(reactionCounts).reduce(
    (sum: number, count: any) => sum + count,
    0,
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={
                post.author.avatar ||
                `https://ui-avatars.com/api/?name=${post.author.first_name}+${post.author.last_name}&background=3B82F6&color=fff`
              }
              alt={`${post.author.first_name} ${post.author.last_name}`}
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h3 className="font-semibold text-gray-900">
                {post.author.first_name} {post.author.last_name}
              </h3>
              <p className="text-sm text-gray-500">
                {formatTimeAgo(post.created_at)}
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </button>

            {showOptions && (
              <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 w-48">
                <button
                  onClick={handleDeletePost}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Excluir post</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-4">
        {renderContent()}

        {post.media_url && (
          <div className="mt-4">
            {post.media_type === "image" ? (
              <div
                className={`${post.is_profile_update || post.is_cover_update ? "border-2 border-blue-200 rounded-lg overflow-hidden" : ""}`}
              >
                <img
                  src={post.media_url}
                  alt={
                    post.is_profile_update
                      ? "Nova foto do perfil"
                      : post.is_cover_update
                        ? "Nova foto de capa"
                        : "Post media"
                  }
                  className={`w-full rounded-lg ${
                    post.is_profile_update
                      ? "max-w-sm mx-auto"
                      : post.is_cover_update
                        ? "aspect-video object-cover"
                        : ""
                  }`}
                />
                {(post.is_profile_update || post.is_cover_update) && (
                  <div className="bg-blue-50 px-4 py-2 text-center">
                    <p className="text-sm text-blue-600 font-medium">
                      {post.is_profile_update
                        ? "Nova foto do perfil"
                        : "Nova foto de capa"}
                    </p>
                  </div>
                )}
              </div>
            ) : post.media_type === "video" ? (
              <video
                src={post.media_url}
                controls
                className="w-full rounded-lg"
              />
            ) : null}
          </div>
        )}
      </div>

      {/* Reactions Summary */}
      {(totalReactions > 0 || loveCount > 0) && (
        <div className="px-6 pb-2">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="flex -space-x-1">
              {Object.entries(reactionCounts).map(([type, count]) => {
                if (count === 0) return null;
                return (
                  <span key={type} className="inline-block">
                    <CustomReactionEmoji type={type} size={20} />
                  </span>
                );
              })}
              {loveCount > 0 && (
                <span className="inline-block">
                  <CustomReactionEmoji type="love" size={20} />
                </span>
              )}
            </div>
            <span>
              {totalReactions + loveCount}{" "}
              {totalReactions + loveCount === 1 ? "reação" : "reações"}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 py-3 border-t border-gray-100">
        {/* Enhanced Reaction Display */}
        <div className="px-6 pb-2">
          <EnhancedReactionDisplay
            postId={post.id}
            userToken={userToken}
            onReactionChange={() => {
              // Refresh any additional data if needed
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <FacebookReactionButton
              currentReaction={currentReaction}
              reactionsCount={post.reactions_count}
              onReactionChange={(reaction) => setCurrentReaction(reaction)}
              onReactionRemove={() => setCurrentReaction(null)}
            />
            {!hideComments ? (
              <button
                onClick={() => setShowComments(!showComments)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Comentar</span>
                {post.comments_count > 0 && (
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                    {post.comments_count}
                  </span>
                )}
              </button>
            ) : (
              <span className="flex items-center space-x-2 px-3 py-2 text-gray-600">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Comentar</span>
                {post.comments_count > 0 && (
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                    {post.comments_count}
                  </span>
                )}
    </div>
  );
};
