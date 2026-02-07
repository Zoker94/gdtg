import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ThumbsUp,
  Heart,
  Laugh,
  Angry,
  MessageCircle,
  MoreHorizontal,
  Trash2,
  Send,
  User,
  MessageSquare,
  Edit,
  X,
  ImagePlus,
  Loader2,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useProfile";
import {
  MarketplacePost,
  useToggleReaction,
  useAddComment,
  useDeletePost,
  useDeleteComment,
  useUpdatePost,
} from "@/hooks/useMarketplace";
import { cn } from "@/lib/utils";
import PrivateMessageDialog from "@/components/messaging/PrivateMessageDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PostCardProps {
  post: MarketplacePost;
}

const REACTIONS = [
  { type: "like" as const, icon: ThumbsUp, label: "Thích", color: "text-blue-500" },
  { type: "heart" as const, icon: Heart, label: "Yêu thích", color: "text-red-500" },
  { type: "laugh" as const, icon: Laugh, label: "Haha", color: "text-yellow-500" },
  { type: "angry" as const, icon: Angry, label: "Phẫn nộ", color: "text-orange-500" },
];

const PostCard = ({ post }: PostCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: roleInfo } = useUserRole();
  const [showComments, setShowComments] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  
  // Edit state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editImages, setEditImages] = useState<string[]>(post.images || []);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  const toggleReaction = useToggleReaction();
  const addComment = useAddComment();
  const deletePost = useDeletePost();
  const deleteComment = useDeleteComment();
  const updatePost = useUpdatePost();

  const isOwner = user?.id === post.user_id;
  const isAdmin = roleInfo?.isAdmin || false;
  const canModerate = isOwner || isAdmin;

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const userReaction = post.reactions?.find((r) => r.user_id === user?.id);

  const reactionCounts = post.reactions?.reduce(
    (acc, r) => {
      acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalReactions = post.reactions?.length || 0;

  const handleReaction = (type: "like" | "heart" | "laugh" | "angry") => {
    toggleReaction.mutate({ postId: post.id, reactionType: type });
    setShowReactions(false);
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    await addComment.mutateAsync({ postId: post.id, content: commentText.trim() });
    setCommentText("");
  };

  const handleViewProfile = () => {
    navigate(`/user/${post.user_id}`);
  };

  const handleOpenEditDialog = () => {
    setEditContent(post.content);
    setEditImages(post.images || []);
    setShowEditDialog(true);
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    if (editImages.length + files.length > 5) {
      toast.error("Chỉ được tải tối đa 5 ảnh");
      return;
    }

    setIsUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error } = await supabase.storage
          .from("chat-images")
          .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from("chat-images")
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
      }

      setEditImages((prev) => [...prev, ...uploadedUrls]);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Tải ảnh thất bại");
    } finally {
      setIsUploadingImages(false);
      if (editImageInputRef.current) {
        editImageInputRef.current.value = "";
      }
    }
  };

  const handleRemoveEditImage = (index: number) => {
    setEditImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      toast.error("Nội dung không được để trống");
      return;
    }

    await updatePost.mutateAsync({
      postId: post.id,
      content: editContent.trim(),
      images: editImages,
      category: post.category,
    });

    setShowEditDialog(false);
  };

  return (
    <>
      <Card className="border-border overflow-hidden">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <button onClick={handleViewProfile}>
                <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                  <AvatarImage src={post.profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(post.profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
              </button>
              <div>
                <button
                  onClick={handleViewProfile}
                  className="font-semibold text-sm hover:text-primary transition-colors"
                >
                  {post.profile?.full_name || "Người dùng"}
                </button>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                    locale: vi,
                  })}
                  {post.updated_at !== post.created_at && " (đã chỉnh sửa)"}
                </p>
              </div>
            </div>

            {canModerate && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleOpenEditDialog}>
                    <Edit className="w-4 h-4 mr-2" />
                    {isAdmin && !isOwner ? "Chỉnh sửa (Admin)" : "Chỉnh sửa bài viết"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => deletePost.mutate(post.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isAdmin && !isOwner ? "Xóa (Admin)" : "Xóa bài viết"}
                  </DropdownMenuItem>
                  {isAdmin && !isOwner && (
                    <div className="px-2 py-1 text-[10px] text-muted-foreground flex items-center gap-1 border-t mt-1 pt-1">
                      <Shield className="w-3 h-3" />
                      Quyền quản trị viên
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Content */}
          <p className="text-sm whitespace-pre-wrap mb-3">{post.content}</p>

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <div className={cn(
              "grid gap-2 mb-3",
              post.images.length === 1 ? "grid-cols-1" : 
              post.images.length === 2 ? "grid-cols-2" : 
              "grid-cols-2 md:grid-cols-3"
            )}>
              {post.images.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`Post image ${index + 1}`}
                  className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(url, "_blank")}
                />
              ))}
            </div>
          )}

          {/* Reaction Summary */}
          {totalReactions > 0 && (
            <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
              <div className="flex -space-x-1">
                {Object.entries(reactionCounts || {}).map(([type]) => {
                  const reaction = REACTIONS.find((r) => r.type === type);
                  if (!reaction) return null;
                  const Icon = reaction.icon;
                  return (
                    <div
                      key={type}
                      className={cn(
                        "w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center",
                        reaction.color
                      )}
                    >
                      <Icon className="w-3 h-3" />
                    </div>
                  );
                })}
              </div>
              <span>{totalReactions} lượt thích</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 pt-2 border-t border-border flex-wrap">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-1",
                  userReaction && REACTIONS.find((r) => r.type === userReaction.reaction_type)?.color
                )}
                onMouseEnter={() => setShowReactions(true)}
                onMouseLeave={() => setShowReactions(false)}
                onClick={() => handleReaction("like")}
              >
                {userReaction ? (
                  <>
                    {(() => {
                      const r = REACTIONS.find((r) => r.type === userReaction.reaction_type);
                      if (!r) return <ThumbsUp className="w-4 h-4 mr-1" />;
                      const Icon = r.icon;
                      return <Icon className="w-4 h-4 mr-1" />;
                    })()}
                    {REACTIONS.find((r) => r.type === userReaction.reaction_type)?.label}
                  </>
                ) : (
                  <>
                    <ThumbsUp className="w-4 h-4 mr-1" />
                    Thích
                  </>
                )}
              </Button>

              {/* Reaction Picker */}
              {showReactions && (
                <div
                  className="absolute bottom-full left-0 mb-1 flex items-center gap-1 p-1.5 bg-card border border-border rounded-full shadow-lg z-10"
                  onMouseEnter={() => setShowReactions(true)}
                  onMouseLeave={() => setShowReactions(false)}
                >
                  {REACTIONS.map((reaction) => {
                    const Icon = reaction.icon;
                    return (
                      <button
                        key={reaction.type}
                        onClick={() => handleReaction(reaction.type)}
                        className={cn(
                          "p-1.5 rounded-full hover:bg-muted transition-all hover:scale-125",
                          reaction.color
                        )}
                        title={reaction.label}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
            >
              <MessageCircle className="w-4 h-4 mr-1" />
              Bình luận {post.comments && post.comments.length > 0 && `(${post.comments.length})`}
            </Button>

            {!isOwner && user && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowMessageDialog(true)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Nhắn tin
              </Button>
            )}

            <Button variant="ghost" size="sm" onClick={handleViewProfile}>
              <User className="w-4 h-4 mr-1" />
              Hồ sơ
            </Button>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="mt-3 pt-3 border-t border-border space-y-3">
              {/* Comment Input */}
              {user && (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Viết bình luận..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleComment()}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={handleComment}
                    disabled={!commentText.trim() || addComment.isPending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Comments List */}
              {post.comments && post.comments.length > 0 && (
                <div className="space-y-2">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={comment.profile?.avatar_url || ""} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(comment.profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">
                            {comment.profile?.full_name || "Người dùng"}
                          </span>
                          {(user?.id === comment.user_id || isAdmin) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => deleteComment.mutate(comment.id)}
                              title={user?.id !== comment.user_id ? "Xóa (Admin)" : "Xóa"}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm">{comment.content}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                            locale: vi,
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Private Message Dialog */}
      <PrivateMessageDialog
        open={showMessageDialog}
        onOpenChange={setShowMessageDialog}
        otherUserId={post.user_id}
        otherUserName={post.profile?.full_name || "Người dùng"}
        otherUserAvatar={post.profile?.avatar_url}
      />

      {/* Edit Post Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa bài viết</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              placeholder="Nội dung bài viết..."
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
              className="resize-none"
            />

            {/* Image Previews */}
            {editImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {editImages.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Image ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handleRemoveEditImage(index)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Image Button */}
            {editImages.length < 5 && (
              <div>
                <input
                  type="file"
                  ref={editImageInputRef}
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleEditImageUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => editImageInputRef.current?.click()}
                  disabled={isUploadingImages}
                >
                  {isUploadingImages ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4 h-4 mr-2" />
                  )}
                  Thêm ảnh ({editImages.length}/5)
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editContent.trim() || updatePost.isPending}
            >
              {updatePost.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PostCard;
