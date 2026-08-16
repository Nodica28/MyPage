import React, {useState, useEffect} from "react";
import {ErrorBoundary} from "@/components/error-boundary";
import {CharacterCreationContainer} from "@/components/headshot-generator/CharacterCreationContainer";
import {CharacterCreationClosedContent} from "@/components/headshot-generator/CharacterCreationSettings";
import {HeadshotGenerationContainer} from "@/components/headshot-generator/HeadshotGenContainer";
import {CharacterProfileDisplay} from "@/components/headshot-generator/CharacterProfileDisplay";
import {useCharacter} from "@/hooks/use-character";
import {ChevronRight, InfoIcon} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

// Main component
export default function HeadshotGenerator() {
  const {character, isLoading, refetch} = useCharacter();

  // UI state
  const [activeView, setActiveView] = useState<
    "profile" | "create" | "headshot"
  >("profile");

  // Set initial view based on whether user has a character
  useEffect(() => {
    if (!isLoading) {
      if (character) {
        setActiveView("profile");
      } else {
        setActiveView("create");
      }
    }
  }, [character, isLoading]);

  // Handle character created/updated callback
  const handleCharacterUpdated = () => {
    refetch();
    setActiveView("profile");
  };

  // Format character data for display
  const formatCharacterData = () => {
    if (!character) return null;

    // Get reference image URL
    const referenceImageUrl = `/api/headshots/reference-image/${character.referenceImage}`;

    // Basic info items
    const basicInfo = [
      {label: "Gender", value: character.gender === "male" ? "Male" : "Female"},
      {label: "Age", value: `${character.age} years old`},
      {label: "Skin Tone", value: character.skinTone},
      {label: "Body Build", value: character.bodyBuild || "average"}
    ];

    // Hair style items
    const hairStyle = [
      {label: "Style", value: character.hairStyle},
      {label: "Length", value: character.hairLength},
      {label: "Facial Hair", value: character.facialHair || "None"}
    ];

    // Hair color items
    const hairColor = [
      {label: "Color", value: character.hairColor},
      {label: "Highlights", value: character.highlights}
    ];

    return {
      referenceImageUrl,
      basicInfo,
      hairStyle,
      hairColor
    };
  };

  // Main content (character profile, creation, or headshot generation)
  const renderMainContent = () => {
    // Display loading state
    if (isLoading) {
      return <div className="py-20 text-center">Loading...</div>;
    }

    // Profile view (when user has a character)
    if (activeView === "profile" && character) {
      const characterData = formatCharacterData();

      if (characterData) {
        return (
          <div className="space-y-6">
            <CharacterProfileDisplay
              characterImageUrl={characterData.referenceImageUrl}
              basicInfo={characterData.basicInfo}
              hairStyle={characterData.hairStyle}
              hairColor={characterData.hairColor}
              onEdit={() => setActiveView("create")}
            />

            {/* Closed headshot generation container that can be clicked to proceed */}
            <div
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden cursor-pointer hover:border-slate-300 transition-colors"
              onClick={() => setActiveView("headshot")}
            >
              <div className="p-6 flex flex-row items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">Generate Headshots</h2>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            You need to first upload your reference image and create your character before proceeding to generate headshots.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Create professional AI headshots using your character
                    profile
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </div>
            </div>
          </div>
        );
      }
    }

    // Create/edit character view
    if (activeView === "create") {
      return (
        <CharacterCreationContainer
          onCharacterCreated={handleCharacterUpdated}
          existingCharacter={character}
          onCancel={character ? () => setActiveView("profile") : undefined}
        />
      );
    }

    // Headshot generation view
    if (activeView === "headshot" && character) {
      return (
        <div>
          <CharacterCreationClosedContent
            title="Character Profile"
            onClick={() => setActiveView("profile")}
          />
          <HeadshotGenerationContainer
            characterId={character.id.toString()}
            onBack={() => setActiveView("profile")}
          />
        </div>
      );
    }

    // Fallback for new users: show character creation
    return (
      <CharacterCreationContainer
        onCharacterCreated={handleCharacterUpdated}
        existingCharacter={null}
        onCancel={character ? () => setActiveView("profile") : undefined}
      />
    );
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-[calc(100vh-48px)]">
        <div className="flex flex-col border-2 sm:rounded-2xl h-full flex-grow bg-white">
          <div className="py-3 px-4 flex flex-row items-center justify-between border-b-2">
            <div>
              <h2 className="text-lg font-medium">Create Headshots</h2>
            </div>
            <div className="flex items-center gap-3 self-end">
              {/* Buttons could go here if needed */}
            </div>
          </div>
          <div className="flex flex-col px-7 py-4 border-y-0 flex-grow">
            {renderMainContent()}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
