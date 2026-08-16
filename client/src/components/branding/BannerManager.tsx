import React, {useState} from "react";
import {useAuth} from "@/hooks/use-auth";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {cn} from "@/lib/utils";
import {useToast} from "@/hooks/use-toast";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {apiRequest} from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {Plus, Pencil, Trash2, Eye, ImageIcon} from "lucide-react";
import BannerEditor from "./BannerEditor";

interface Banner {
  id: string;
  name?: string;
  headline: {
    text: string;
    font: string;
    color: string;
  };
  subheadline?: {
    text: string;
    font: string;
    color: string;
  };
  tags: Array<{
    text: string;
    color: string;
    backgroundColor: string;
  }>;
  backgroundType: "preset" | "custom";
  backgroundValue: string;
  customUploadUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

interface BannerManagerProps {
  onEditBanner?: (bannerId: string) => void;
}

export function BannerManager({onEditBanner}: BannerManagerProps) {
  const {user} = useAuth();
  const {toast} = useToast();
  const queryClient = useQueryClient();
  const [showEditor, setShowEditor] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  // Get user's saved banners and current active banner
  const savedBanners = (user?.bannerSettings as any)?.savedBanners || [];
  const activeBanner = (user?.bannerSettings as any)?.activeBannerId;

  // Delete banner mutation
  const deleteBannerMutation = useMutation({
    mutationFn: async (bannerId: string) => {
      const data = await apiRequest(`/api/users/banner/${bannerId}`, {
        method: "DELETE"
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["user"]});
      toast({
        title: "Banner deleted",
        description: "Your banner has been deleted successfully."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting banner",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Activate banner mutation
  const activateBannerMutation = useMutation({
    mutationFn: async (bannerId: string) => {
      const data = await apiRequest(`/api/users/banner/${bannerId}/activate`, {
        method: "PUT"
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["user"]});
      toast({
        title: "Banner activated",
        description: "Your banner is now active on your profile."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error activating banner",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleEditBanner = (banner: Banner) => {
    setEditingBanner(banner);
    setShowEditor(true);
    onEditBanner?.(banner.id);
  };

  const handleAddBanner = () => {
    setEditingBanner(null);
    setShowEditor(true);
  };

  const handleDeleteBanner = (bannerId: string) => {
    deleteBannerMutation.mutate(bannerId);
  };

  const handleActivateBanner = (bannerId: string) => {
    activateBannerMutation.mutate(bannerId);
  };

  const handleBackToList = () => {
    setShowEditor(false);
    setEditingBanner(null);
  };

  // Render banner preview
  const renderBannerPreview = (banner: Banner) => {
    const isCustomUpload =
      banner.backgroundType === "custom" && banner.customUploadUrl;

    return (
      <div
        className={cn(
          "h-32 rounded-lg overflow-hidden relative transition-all",
          isCustomUpload ? "" : banner.backgroundValue
        )}
        style={
          isCustomUpload
            ? {
                backgroundImage: `url(${banner.customUploadUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center"
              }
            : {}
        }
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/10" />

        {/* Banner content preview */}
        <div className="relative h-full flex flex-col gap-2 p-3">
          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {banner.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm"
                style={{
                  backgroundColor: tag.backgroundColor,
                  color: tag.color
                }}
              >
                {tag.text}
              </span>
            ))}
          </div>

          {/* Headlines */}
          <div className="text-center">
            <h3
              className={cn("text-sm font-bold", banner.headline.font)}
              style={{color: banner.headline.color}}
            >
              {banner.headline.text}
            </h3>
            {banner.subheadline?.text && (
              <p
                className={cn("text-xs", banner.subheadline.font)}
                style={{color: banner.subheadline.color}}
              >
                {banner.subheadline.text}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // If editor is open, show the editor
  if (showEditor) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleBackToList}>
            ← Back to Banners
          </Button>
        </div>
        <BannerEditor
          editingBanner={editingBanner}
          onSaveComplete={handleBackToList}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Your Banners</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage custom banners for your profile
          </p>
        </div>
        {savedBanners.length > 0 && (
          <Button onClick={handleAddBanner} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Banner
          </Button>
        )}
      </div>

      {/* Banners Grid */}
      {savedBanners.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedBanners.map((banner: Banner) => {
            const isActive = activeBanner?.id === banner.id;
            return (
              <Card
                key={banner.id}
                className={`overflow-hidden ${isActive ? "ring-2 ring-blue-500" : ""}`}
              >
                <CardContent className="p-0">
                  {renderBannerPreview(banner)}
                  {isActive && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      Active
                    </div>
                  )}
                </CardContent>
                <CardHeader className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm truncate">
                        {banner.name || banner.headline.text}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Created{" "}
                        {new Date(banner.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleActivateBanner(banner.id)}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                          title="Activate banner"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditBanner(banner)}
                        className="h-8 w-8 p-0"
                        title="Edit banner"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            title="Delete banner"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Banner</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this banner? This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteBanner(banner.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-3 mb-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No banners yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
              Create your first custom banner to use as a background on your
              profile
            </p>
            <Button onClick={handleAddBanner} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Banner
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default BannerManager;
