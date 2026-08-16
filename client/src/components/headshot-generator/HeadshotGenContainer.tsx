import React from "react";
import {useMutation} from "@tanstack/react-query";
import {useToast} from "@/hooks/use-toast";
import {useLocation} from "wouter";
import {ErrorBoundary} from "@/components/error-boundary";
import {CharacterService} from "@/lib/services/character-service";
import {Button} from "@/components/ui/button";
import {ChevronLeft} from "lucide-react";
import {
  HeadshotSettings,
  HeadshotOptions
} from "@/components/headshot-generator/HeadshotSettings";

interface HeadshotGenerationContainerProps {
  characterId: string;
  onHeadshotsGenerated?: () => void;
  onBack?: () => void;
}

export function HeadshotGenerationContainer({
  characterId,
  onHeadshotsGenerated,
  onBack
}: HeadshotGenerationContainerProps) {
  const {toast} = useToast();
  const [, setLocation] = useLocation();

  // Generate headshot mutation
  const generateHeadshotMutation = useMutation({
    mutationFn: (options: HeadshotOptions) => {
      if (!characterId) throw new Error("Character not created yet");

      return CharacterService.generateHeadshot({
        characterId,
        options
      });
    },
    onSuccess: (response) => {
      // Set a flag in localStorage to indicate we just started generating a headshot
      localStorage.setItem("justGeneratedHeadshot", "true");
      if (response?.generationId) {
        localStorage.setItem("lastGenerationId", response.generationId);
      }

      toast({
        title: "Generation Started",
        description:
          "Your headshot is being generated. This may take a few minutes."
      });

      if (onHeadshotsGenerated) {
        onHeadshotsGenerated();
      }

      // Redirect to the headshots gallery
      setLocation("/headshots");
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to start generation",
        variant: "destructive"
      });
    }
  });

  // Handle headshot generation
  const handleGenerateHeadshot = (options: HeadshotOptions) => {
    generateHeadshotMutation.mutate(options);
  };

  return (
    <ErrorBoundary>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-xl font-semibold">Generate Headshot</h2>
              <p className="text-sm text-muted-foreground">
                Configure the settings for your AI-generated headshot.
              </p>
            </div>
            {onBack && (
              <Button
                variant="ghost"
                onClick={onBack}
                className="flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                <span>Back to Profile</span>
              </Button>
            )}
          </div>
        </div>

        <div className="p-6">
          <HeadshotSettings
            characterId={characterId}
            onGenerate={handleGenerateHeadshot}
            isGenerating={generateHeadshotMutation.isPending}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
