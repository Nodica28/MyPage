import React, {useState, useEffect} from "react";
import {useMutation} from "@tanstack/react-query";
import {useToast} from "@/hooks/use-toast";
import {ErrorBoundary} from "@/components/error-boundary";
import {CharacterService} from "@/lib/services/character-service";
import {Character} from "@/hooks/use-character";
import {
  CharacterCreationStepIndicator,
  UploadStep,
  BasicInfoStep,
  HairStyleStep,
  PromptReviewStep,
  CharacterCreationNavigation,
  SecondaryContent
} from "@/components/headshot-generator/CharacterCreationSettings";

interface CharacterCreationContainerProps {
  onCharacterCreated: (character?: Character) => void;
  existingCharacter?: Character | null;
  onCancel?: () => void;
}

export function CharacterCreationContainer({
  onCharacterCreated,
  existingCharacter,
  onCancel
}: CharacterCreationContainerProps) {
  const {toast} = useToast();
  const [currentCharacterCreationStep, setCurrentCharacterCreationStep] =
    useState(1);
  const [openSections, setOpenSections] = useState<string[]>(["hairStyle"]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [existingImageRemoved, setExistingImageRemoved] = useState(false);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [age, setAge] = useState<number>(30);
  const [skinTone, setSkinTone] = useState<string>("medium");
  const [bodyBuild, setBodyBuild] = useState<string>("average");
  const [hairStyle, setHairStyle] = useState<string>("straight");
  const [hairLength, setHairLength] = useState<string>("medium");
  const [hairColor, setHairColor] = useState<string>("brown");
  const [highlights, setHighlights] = useState<string>("none");
  const [facialHair, setFacialHair] = useState<string>("none");
  const [characterPrompt, setCharacterPrompt] = useState<string>("");
  const [useCustomCharacterPrompt, setUseCustomPrompt] =
    useState<boolean>(false);
  const [defaultPrompt, setDefaultPrompt] = useState<string>("");

  // Initialize state from existing character if available
  useEffect(() => {
    if (existingCharacter) {
      // Use the existing asset ID as default
      setAssetId(existingCharacter.referenceImage);

      // Set all the character attributes
      setGender(existingCharacter.gender as "male" | "female");
      setAge(existingCharacter.age);
      setSkinTone(existingCharacter.skinTone);
      setBodyBuild(existingCharacter.bodyBuild || "average");
      setHairStyle(existingCharacter.hairStyle);
      setHairLength(existingCharacter.hairLength);
      setHairColor(existingCharacter.hairColor);
      setHighlights(existingCharacter.highlights);

      if (existingCharacter.facialHair) {
        setFacialHair(existingCharacter.facialHair);
      }

      // Set custom prompt state
      if (
        existingCharacter.useCustomCharacterPrompt &&
        existingCharacter.customPrompt
      ) {
        setUseCustomPrompt(true);
        setCharacterPrompt(existingCharacter.customPrompt);
      } else {
        setUseCustomPrompt(false);
        // Create initial character prompt based on existing data
        const initialPrompt = generateDefaultPrompt(
          existingCharacter.gender,
          existingCharacter.age,
          existingCharacter.hairLength,
          existingCharacter.hairStyle,
          existingCharacter.hairColor,
          existingCharacter.highlights,
          existingCharacter.skinTone,
          existingCharacter.bodyBuild || "average",
          existingCharacter.gender === "male"
            ? existingCharacter.facialHair
            : undefined
        );
        setCharacterPrompt(initialPrompt);
        setDefaultPrompt(initialPrompt);
      }
    }
  }, [existingCharacter]);

  // Generate a default prompt based on the current attributes
  const generateDefaultPrompt = (
    gender: string,
    age: number,
    hairLength: string,
    hairStyle: string,
    hairColor: string,
    highlights: string,
    skinTone: string,
    bodyBuild: string,
    facialHair?: string
  ) => {
    return `${gender === "male" ? "Male" : "Female"}, ${age} years old, with ${hairLength} ${hairColor} ${hairStyle} hair${
      highlights !== "none" ? ` with ${highlights} highlights` : ""
    }, ${skinTone} skin tone, ${bodyBuild} build${
      gender === "male" && facialHair && facialHair !== "none"
        ? `, with ${facialHair}`
        : ""
    }.`;
  };

  // Update default prompt whenever attributes change
  useEffect(() => {
    const newDefaultPrompt = generateDefaultPrompt(
      gender,
      age,
      hairLength,
      hairStyle,
      hairColor,
      highlights,
      skinTone,
      bodyBuild,
      gender === "male" ? facialHair : undefined
    );
    setDefaultPrompt(newDefaultPrompt);

    // Only update the character prompt if not using custom prompt
    if (!useCustomCharacterPrompt) {
      setCharacterPrompt(newDefaultPrompt);
    }
  }, [
    gender,
    age,
    hairLength,
    hairStyle,
    hairColor,
    highlights,
    skinTone,
    bodyBuild,
    facialHair,
    useCustomCharacterPrompt
  ]);

  // Handle reset button click
  const handleResetPrompt = () => {
    setUseCustomPrompt(false);
    setCharacterPrompt(defaultPrompt);
    toast({
      title: "Prompt reset",
      description: "Your custom prompt has been reset to the default."
    });
  };

  // Handle cancellation
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // Handle image removal
  const handleRemoveImage = () => {
    setSelectedFile(null);
    setAssetId(null);
    setExistingImageRemoved(true);
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => CharacterService.uploadReferenceImage(file),
    onSuccess: (assetId) => {
      setAssetId(assetId);
      toast({
        title: "Success",
        description: "Image uploaded successfully!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
        variant: "destructive"
      });
    }
  });

  // Create character mutation
  const createCharacterMutation = useMutation<Character, Error, any>({
    mutationFn: async (characterData: any) => {
      if (!characterData.assetId)
        throw new Error("Please upload an image first");

      const finalAssetId = characterData.assetId;

      // Create the character using the service
      await CharacterService.createCharacter(finalAssetId, {
        gender: characterData.gender,
        age: characterData.age,
        hairStyle: characterData.hairStyle,
        hairLength: characterData.hairLength,
        hairColor: characterData.hairColor,
        highlights: characterData.highlights,
        skinTone: characterData.skinTone,
        bodyBuild: characterData.bodyBuild,
        facialHair:
          characterData.gender === "male" ? characterData.facialHair : "none",
        customPrompt: characterData.customPrompt,
        useCustomCharacterPrompt: characterData.useCustomCharacterPrompt,
        prompt: characterData.prompt
      });

      // Create a Character object to return
      // This is just to satisfy TypeScript, the actual object isn't used
      return {
        id: characterData.id || 0,
        userId: 0,
        name: characterData.name || "",
        renderNetId: "",
        referenceImage: finalAssetId,
        prompt: characterData.prompt || "",
        gender: characterData.gender,
        age: characterData.age,
        hairStyle: characterData.hairStyle,
        hairLength: characterData.hairLength,
        hairColor: characterData.hairColor,
        highlights: characterData.highlights,
        skinTone: characterData.skinTone,
        bodyBuild: characterData.bodyBuild,
        facialHair: characterData.facialHair,
        customPrompt: characterData.customPrompt,
        useCustomCharacterPrompt: characterData.useCustomCharacterPrompt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Character;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Character created successfully!"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Character creation failed",
        description: error.message || "Failed to process character",
        variant: "destructive"
      });
    }
  });

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG or WebP image.",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be under 10MB.",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    setExistingImageRemoved(false); // Reset the removed flag when uploading a new file
    uploadMutation.mutate(file);
  };

  // Navigate steps
  const goToNextStep = () => {
    if (currentCharacterCreationStep === 1 && !selectedFile && !assetId) {
      toast({
        title: "Upload required",
        description: "Please upload a reference image to continue.",
        variant: "destructive"
      });
      return;
    }

    // Generate prompt when going to step 4
    if (currentCharacterCreationStep === 3) {
      const prompt = `${gender === "male" ? "Male" : "Female"}, ${age} years old, with ${hairLength} ${hairColor} ${hairStyle} hair${
        highlights !== "none" ? ` with ${highlights} highlights` : ""
      }, ${skinTone} skin tone${
        gender === "male" && facialHair !== "none" ? `, with ${facialHair}` : ""
      }.`;

      // Only set the prompt if there isn't one already (to avoid overwriting user edits)
      if (!characterPrompt) {
        setCharacterPrompt(prompt);
      }
    }

    // Create character on final step
    if (currentCharacterCreationStep === 4) {
      handleCreateCharacter();
      return;
    }

    const nextStep = Math.min(currentCharacterCreationStep + 1, 4);
    setCurrentCharacterCreationStep(nextStep);

    // Initialize sections for the next step
    let initialSections: string[] = [];
    if (nextStep === 2) {
      initialSections = ["gender", "age", "skinTone"];
    } else if (nextStep === 3) {
      initialSections = ["hairStyle"];
    } else if (nextStep === 4) {
      initialSections = ["facialSkinTone"];
    }
    // Set initial sections for the step (empty array for step 5/review)
    setOpenSections(initialSections);
  };

  const goToPreviousStep = () => {
    const prevStep = Math.max(currentCharacterCreationStep - 1, 1);
    setCurrentCharacterCreationStep(prevStep);

    // Initialize sections for the previous step
    let initialSections: string[] = [];
    if (prevStep === 2) {
      initialSections = ["gender"];
    } else if (prevStep === 3) {
      initialSections = ["hairStyle"];
    }
    // Set initial sections for the step (empty array for step 1/upload)
    setOpenSections(initialSections);
  };

  // Render the current step content
  const renderStepContent = () => {
    switch (currentCharacterCreationStep) {
      case 1:
        return (
          <UploadStep
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            handleFileChange={handleFileChange}
            existingImageUrl={
              existingCharacter && !existingImageRemoved
                ? `/api/headshots/reference-image/${existingCharacter.referenceImage}`
                : undefined
            }
            onRemoveImage={handleRemoveImage}
          />
        );
      case 2:
        return (
          <BasicInfoStep
            gender={gender}
            setGender={setGender}
            age={age}
            setAge={setAge}
            skinTone={skinTone}
            setSkinTone={setSkinTone}
            bodyBuild={bodyBuild}
            setBodyBuild={setBodyBuild}
            openSections={openSections}
            setOpenSections={setOpenSections}
          />
        );
      case 3:
        return (
          <HairStyleStep
            gender={gender}
            hairStyle={hairStyle}
            setHairStyle={setHairStyle}
            hairLength={hairLength}
            setHairLength={setHairLength}
            hairColor={hairColor}
            setHairColor={setHairColor}
            highlights={highlights}
            setHighlights={setHighlights}
            facialHair={facialHair}
            setFacialHair={setFacialHair}
            openSections={openSections}
            setOpenSections={setOpenSections}
          />
        );
      case 4:
        return (
          <PromptReviewStep
            characterPrompt={characterPrompt}
            setCharacterPrompt={setCharacterPrompt}
            useCustomCharacterPrompt={useCustomCharacterPrompt}
            setUseCustomPrompt={setUseCustomPrompt}
            defaultPrompt={defaultPrompt}
            onResetPrompt={handleResetPrompt}
            isEditing={!!existingCharacter}
          />
        );
      default:
        return null;
    }
  };

  const handleCreateCharacter = async () => {
    try {
      // Validate required fields
      if (!assetId) {
        toast({
          title: "Missing required information",
          description: "Please upload a profile image",
          variant: "destructive"
        });
        return;
      }

      // Prepare character data
      const characterData = {
        assetId,
        name: `Character_${Date.now()}`,
        gender,
        age,
        hairStyle,
        hairLength,
        hairColor,
        highlights,
        facialHair: gender === "male" ? facialHair : "none",
        skinTone,
        bodyBuild,
        customPrompt: characterPrompt,
        useCustomCharacterPrompt
      };

      if (existingCharacter) {
        // Update existing character
        await createCharacterMutation.mutateAsync({
          ...characterData,
          id: existingCharacter.id
        });
        onCharacterCreated();
      } else {
        // Create new character
        await createCharacterMutation.mutateAsync(characterData);
        onCharacterCreated();
      }
    } catch (error: any) {
      console.error("Failed to create/update character:", error);
      toast({
        title: existingCharacter
          ? "Failed to update character"
          : "Failed to create character",
        description: error?.message || "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  return (
    <ErrorBoundary>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold">
              {existingCharacter ? "Edit Character" : "Create Character"}
            </h2>
            <p className="text-sm text-muted-foreground">
              This is your profile that we save to generate realistic headshots.
            </p>
          </div>
        </div>

        <CharacterCreationStepIndicator
          currentStep={currentCharacterCreationStep}
        />
        <div className="max-w-xl mx-auto pb-10">
          <div>{renderStepContent()}</div>

          <CharacterCreationNavigation
            currentStep={currentCharacterCreationStep}
            goToPreviousStep={goToPreviousStep}
            goToNextStep={goToNextStep}
            isCreating={createCharacterMutation.isPending}
            isEditing={!!existingCharacter}
            onCancel={existingCharacter ? handleCancel : undefined}
          />
        </div>
      </div>
      <SecondaryContent />
    </ErrorBoundary>
  );
}
