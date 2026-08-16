import React, {useState} from "react";
import {Button} from "@/components/ui/button";
import {Slider} from "@/components/ui/slider";
import {Textarea} from "@/components/ui/textarea";
import {Label} from "@/components/ui/label";
import {Badge} from "@/components/ui/badge";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";
import {
  Upload,
  ImageIcon,
  Loader2,
  Mars,
  Venus,
  ChevronRight,
  RotateCcw
} from "lucide-react";
import {Checkbox} from "@/components/ui/checkbox";

// Shared components
export function SectionHeader({
  title,
  subtitle
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6 text-center">
      <h3 className="font-semibold text-xl">{title}</h3>
      {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
    </div>
  );
}

export function OptionCard({
  label,
  selected,
  onClick,
  icon
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg cursor-pointer transition-all flex justify-center",
        "border",
        selected
          ? "border-primary bg-slate-50"
          : "border-slate-200 hover:border-slate-300"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2.5">
        {icon && <div>{icon}</div>}
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );
}

export function ColorSwatch({
  color,
  selected,
  onClick,
  label
}: {
  color: string;
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5" onClick={onClick}>
      <div
        className={cn(
          "w-8 h-8 rounded-full cursor-pointer transition-all",
          "border-2",
          selected
            ? "border-primary shadow-lg scale-110"
            : "border-transparent hover:scale-105"
        )}
        style={{
          backgroundColor: color,
          boxShadow: selected
            ? `0 0 0 2px white, 0 0 0 4px ${color}`
            : undefined
        }}
      />
      <span className="text-xs">{label}</span>
    </div>
  );
}

// Step progress indicator component
export function CharacterCreationStepIndicator({
  currentStep
}: {
  currentStep: number;
}) {
  const steps = [
    {id: 1, label: "Upload"},
    {id: 2, label: "Basic Info"},
    {id: 3, label: "Hair"},
    {id: 4, label: "Review Prompt"}
  ];

  return (
    <div className="my-8 max-w-3xl mx-auto">
      <div className="grid grid-cols-4 w-full relative">
        {/* Connecting lines layer */}
        <div className="absolute top-[5px] left-[calc(25%-50px)] right-[calc(25%-50px)] md:left-[96px] md:right-[96px] h-0.5 z-0">
          {/* Background line (gray) */}
          <div className="absolute h-0.5 bg-muted w-full" />

          {/* Progress line (blue/primary) */}
          <div
            className="absolute h-0.5 bg-primary transition-all duration-300 ease-in-out"
            style={{
              width:
                currentStep === 1
                  ? "0%"
                  : `${Math.min(100, ((currentStep - 1) / (steps.length - 1)) * 100)}%`
            }}
          />
        </div>

        {/* Step dots and labels */}
        {steps.map((step) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;

          return (
            <div key={step.id} className="flex flex-col items-center z-10">
              {/* Circle indicator */}
              <div
                className={cn(
                  "w-3 h-3 rounded-full flex items-center justify-center mb-1.5 z-10",
                  isActive
                    ? "bg-white border-primary border-2"
                    : isCompleted
                      ? "bg-primary"
                      : "bg-white border-muted-foreground/30 border-2"
                )}
              ></div>

              {/* Step label */}
              <span
                className={cn(
                  "text-xs font-medium text-center",
                  isActive || isCompleted
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// StepSelection component (collapsible section)
export function StepSelection({
  title,
  children,
  onClick,
  hasChevron = true,
  id,
  openSections = [],
  setOpenSections
}: {
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
  hasChevron?: boolean;
  id?: string;
  openSections?: string[];
  setOpenSections?: (sections: string[]) => void;
}) {
  const isOpen = hasChevron ? (id ? openSections.includes(id) : false) : true;

  const handleHeaderClick = () => {
    if (id && setOpenSections) {
      if (isOpen) {
        // Remove from open sections
        setOpenSections(openSections.filter((secId) => secId !== id));
      } else {
        // Add to open sections
        setOpenSections([...openSections, id]);
      }
    }
    if (onClick) onClick();
  };

  return (
    <div className="mb-6 overflow-hidden">
      <div
        className={cn(
          "flex items-center justify-between mb-2",
          hasChevron ? "cursor-pointer" : ""
        )}
        onClick={hasChevron ? handleHeaderClick : undefined}
      >
        <h3 className="font-semibold text-sm">{title}</h3>
        {hasChevron && (
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform duration-300 ease-in-out",
              isOpen && "rotate-90"
            )}
          />
        )}
      </div>
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn("py-1 m-1")}>{children}</div>
      </div>
    </div>
  );
}

// Upload Step Component
export function UploadStep({
  selectedFile,
  setSelectedFile,
  handleFileChange,
  existingImageUrl,
  onRemoveImage
}: {
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  existingImageUrl?: string;
  onRemoveImage?: () => void;
}) {
  const [existingImageLoading, setExistingImageLoading] =
    useState(!!existingImageUrl);
  const [existingImageError, setExistingImageError] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleExistingImageLoad = () => {
    setExistingImageLoading(false);
  };

  const handleExistingImageError = () => {
    setExistingImageLoading(false);
    setExistingImageError(true);
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];

      // Create a synthetic event by mimicking an input element change
      const input = document.createElement("input");
      input.type = "file";
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;

      const syntheticEvent = {
        target: input,
        currentTarget: input
      } as React.ChangeEvent<HTMLInputElement>;

      handleFileChange(syntheticEvent);
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-4">Upload Reference Image</h3>
      <div className="grid gap-6">
        <Label
          htmlFor="picture"
          className={cn(
            "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-slate-300 bg-slate-50 hover:bg-slate-100"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedFile || existingImageUrl ? (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <div className="relative w-full h-full flex items-center justify-center">
                {selectedFile ? (
                  // Selected file preview
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Preview"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : existingImageUrl ? (
                  // Existing image with loading state
                  <>
                    {existingImageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                        <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                      </div>
                    )}

                    {existingImageError ? (
                      <div className="flex flex-col items-center justify-center text-center p-4">
                        <p className="text-sm text-slate-500 mb-2">
                          Failed to load image
                        </p>
                        <p className="text-xs text-slate-400">
                          Please upload a new reference image
                        </p>
                      </div>
                    ) : (
                      <img
                        src={existingImageUrl}
                        alt="Preview"
                        className={`max-h-full max-w-full object-contain ${existingImageLoading ? "opacity-0" : "opacity-100"}`}
                        onLoad={handleExistingImageLoad}
                        onError={handleExistingImageError}
                      />
                    )}
                  </>
                ) : null}

                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedFile(null);
                    if (onRemoveImage) {
                      onRemoveImage();
                    }
                  }}
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            // Upload area
            <>
              <ImageIcon className="h-12 w-12 text-slate-400 mb-4" />
              <h3 className="font-medium text-sm mb-1">
                Click to upload or drag and drop
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                SVG, PNG, JPG or GIF (max. 10MB)
              </p>
              <Input
                type="file"
                id="image-upload"
                className="hidden"
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp,image/gif"
              />
              <label htmlFor="image-upload">
                <Button className="cursor-pointer" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    Select File
                  </span>
                </Button>
              </label>
            </>
          )}
        </Label>
      </div>
    </div>
  );
}

// Basic Info Step Component
export function BasicInfoStep({
  gender,
  setGender,
  age,
  setAge,
  skinTone,
  setSkinTone,
  bodyBuild,
  setBodyBuild,
  openSections,
  setOpenSections
}: {
  gender: "male" | "female";
  setGender: (gender: "male" | "female") => void;
  age: number;
  setAge: (age: number) => void;
  skinTone: string;
  setSkinTone: (skinTone: string) => void;
  bodyBuild: string;
  setBodyBuild: (bodyBuild: string) => void;
  openSections: string[];
  setOpenSections: (sections: string[]) => void;
}) {
  const SKIN_TONES = [
    {value: "very-fair", label: "Very Fair", color: "#FFE0BD"},
    {value: "fair", label: "Fair", color: "#F1C27D"},
    {value: "medium", label: "Medium", color: "#E0AC69"},
    {value: "olive", label: "Olive", color: "#C68642"},
    {value: "brown", label: "Brown", color: "#8D5524"},
    {value: "dark-brown", label: "Dark Brown", color: "#342422"},
    {value: "very-dark", label: "Very Dark", color: "#342422"}
  ];

  return (
    <>
      <SectionHeader
        title="Tell us about yourself."
        subtitle="These details help create a headshot that truly represents you."
      />
      <StepSelection
        title="Character Gender"
        id="gender"
        hasChevron={false}
        openSections={openSections}
        setOpenSections={setOpenSections}
      >
        <div className="grid grid-cols-2 gap-4">
          <OptionCard
            label="Male"
            selected={gender === "male"}
            onClick={() => setGender("male")}
            icon={<Mars className="h-5 w-5" />}
          />
          <OptionCard
            label="Female"
            selected={gender === "female"}
            onClick={() => setGender("female")}
            icon={<Venus className="h-5 w-5" />}
          />
        </div>
      </StepSelection>

      {/* Non-collapsible age slider to ensure smooth operation */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Character Age</h3>
        </div>
        <div className="py-1 my-1">
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-center">
              <span className="font-medium">{age} years</span>
            </div>
            <Slider
              id="age-slider"
              defaultValue={[age]}
              value={[age]}
              max={80}
              min={18}
              step={1}
              onValueChange={(value) => setAge(value[0])}
            />
          </div>
        </div>
      </div>

      <StepSelection
        title="Skin Tone"
        id="skinTone"
        hasChevron={false}
        openSections={openSections}
        setOpenSections={setOpenSections}
      >
        <div className="flex flex-wrap gap-4 justify-between">
          {SKIN_TONES.map((tone) => (
            <ColorSwatch
              key={tone.value}
              color={tone.color}
              label={tone.label}
              selected={skinTone === tone.value}
              onClick={() => setSkinTone(tone.value)}
            />
          ))}
        </div>
      </StepSelection>

      <StepSelection
        title="Body Build"
        id="bodyBuild"
        hasChevron={false}
        openSections={openSections}
        setOpenSections={setOpenSections}
      >
        <div className="grid grid-cols-2 gap-4">
          {[
            {value: "slim", label: "Slim"},
            {value: "athletic", label: "Athletic"},
            {value: "average", label: "Average"},
            {value: "muscular", label: "Muscular"},
            {value: "plus-size", label: "Plus Size"}
          ].map((build) => (
            <OptionCard
              key={build.value}
              label={build.label}
              selected={bodyBuild === build.value}
              onClick={() => setBodyBuild(build.value)}
            />
          ))}
        </div>
      </StepSelection>
    </>
  );
}

// Hair Style Step Component
export function HairStyleStep({
  gender,
  hairStyle,
  setHairStyle,
  hairLength,
  setHairLength,
  hairColor,
  setHairColor,
  highlights,
  setHighlights,
  facialHair,
  setFacialHair,
  openSections,
  setOpenSections
}: {
  gender: "male" | "female";
  hairStyle: string;
  setHairStyle: (style: string) => void;
  hairLength: string;
  setHairLength: (length: string) => void;
  hairColor: string;
  setHairColor: (color: string) => void;
  highlights: string;
  setHighlights: (highlights: string) => void;
  facialHair: string;
  setFacialHair: (facialHair: string) => void;
  openSections: string[];
  setOpenSections: (sections: string[]) => void;
}) {
  const HAIR_STYLES = [
    {value: "straight", label: "Straight"},
    {value: "wavy", label: "Wavy"},
    {value: "curly", label: "Curly"},
    {value: "coily", label: "Coily"},
    {value: "afro", label: "Afro"},
    {value: "braided", label: "Braided"},
    {value: "dreadlocks", label: "Dreadlocks"}
  ];

  const handleOptionSelect = (value: string, nextSection: string) => {
    // Set the value
    setHairStyle(value);
    // Add the next section to open sections
    setOpenSections([...openSections, nextSection]);
  };

  const handleHairLengthSelect = (value: string) => {
    setHairLength(value);
    // Add the hair color section to open sections
    setOpenSections([...openSections, "hairColor"]);
  };

  const handleHairColorSelect = (value: string) => {
    setHairColor(value);
    // Add the highlights section to open sections
    setOpenSections([...openSections, "highlights"]);
  };

  const handleHighlightsSelect = (value: string) => {
    setHighlights(value);
    // Add the facial hair section to open sections
    if (gender === "male") {
      setOpenSections([...openSections, "facialHair"]);
    }
  };

  return (
    <>
      <SectionHeader
        title="Let's define your look"
        subtitle="Your hair style and color are key elements of your professional image."
      />
      <StepSelection
        title="Hair Style"
        id="hairStyle"
        openSections={openSections}
        setOpenSections={setOpenSections}
      >
        <div className="grid grid-cols-3 gap-2">
          {HAIR_STYLES.map((style) => (
            <OptionCard
              key={style.value}
              label={style.label}
              selected={hairStyle === style.value}
              onClick={() => handleOptionSelect(style.value, "hairLength")}
            />
          ))}
        </div>
      </StepSelection>

      <StepSelection
        title="Hair Length"
        id="hairLength"
        openSections={openSections}
        setOpenSections={setOpenSections}
      >
        <div className="grid grid-cols-3 gap-2">
          {[
            {value: "buzz", label: "Buzz Cut"},
            {value: "very-short", label: "Very Short"},
            {value: "short", label: "Short"},
            {value: "medium", label: "Medium"},
            {value: "long", label: "Long"},
            {value: "very-long", label: "Very Long"}
          ].map((length) => (
            <OptionCard
              key={length.value}
              label={length.label}
              selected={hairLength === length.value}
              onClick={() => handleHairLengthSelect(length.value)}
            />
          ))}
        </div>
      </StepSelection>

      <StepSelection
        title="Hair Color"
        id="hairColor"
        openSections={openSections}
        setOpenSections={setOpenSections}
      >
        <div className="flex flex-wrap gap-4 justify-between">
          {[
            {value: "black", label: "Black", color: "#000000"},
            {value: "dark-brown", label: "Dark Brown", color: "#3B2417"},
            {value: "brown", label: "Brown", color: "#634E34"},
            {value: "light-brown", label: "Light Brown", color: "#A17E49"},
            {value: "blonde", label: "Blonde", color: "#E6BE8A"},
            {value: "platinum", label: "Platinum", color: "#E8E1CF"},
            {value: "red", label: "Red", color: "#A43A2A"},
            {value: "auburn", label: "Auburn", color: "#7C2B22"},
            {value: "gray", label: "Gray", color: "#B0B0B0"},
            {value: "white", label: "White", color: "#FFFFFF"}
          ].map((color) => (
            <ColorSwatch
              key={color.value}
              color={color.color}
              label={color.label}
              selected={hairColor === color.value}
              onClick={() => handleHairColorSelect(color.value)}
            />
          ))}
        </div>
      </StepSelection>

      <StepSelection
        title="Hair Highlights"
        id="highlights"
        openSections={openSections}
        setOpenSections={setOpenSections}
      >
        <div className="flex flex-wrap gap-4 justify-between">
          {[
            {value: "none", label: "None", color: "transparent"},
            {value: "blonde", label: "Blonde", color: "#E6BE8A"},
            {value: "caramel", label: "Caramel", color: "#B17F43"},
            {value: "red", label: "Red", color: "#A43A2A"},
            {value: "blue", label: "Blue", color: "#2D5DA8"},
            {value: "purple", label: "Purple", color: "#7A54A8"},
            {value: "pink", label: "Pink", color: "#E87FB0"}
          ].map((color) => (
            <ColorSwatch
              key={color.value}
              color={color.color}
              label={color.label}
              selected={highlights === color.value}
              onClick={() => handleHighlightsSelect(color.value)}
            />
          ))}
        </div>
      </StepSelection>
      {gender === "male" && (
        <StepSelection
          title="Facial Hair"
          id="facialHair"
          openSections={openSections}
          setOpenSections={setOpenSections}
        >
          <div className="grid grid-cols-3 gap-2">
            {[
              {value: "none", label: "None"},
              {value: "stubble", label: "Stubble"},
              {value: "mustache", label: "Mustache"},
              {value: "goatee", label: "Goatee"},
              {value: "short-beard", label: "Short Beard"},
              {value: "full-beard", label: "Full Beard"}
            ].map((style) => (
              <OptionCard
                key={style.value}
                label={style.label}
                selected={facialHair === style.value}
                onClick={() => setFacialHair(style.value)}
              />
            ))}
          </div>
        </StepSelection>
      )}
    </>
  );
}

// Prompt Review Step Component
export function PromptReviewStep({
  characterPrompt,
  setCharacterPrompt,
  useCustomCharacterPrompt,
  setUseCustomPrompt,
  defaultPrompt,
  onResetPrompt,
  isEditing
}: {
  characterPrompt: string;
  setCharacterPrompt: (prompt: string) => void;
  useCustomCharacterPrompt: boolean;
  setUseCustomPrompt: (useCustom: boolean) => void;
  defaultPrompt: string;
  onResetPrompt: () => void;
  isEditing: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">Create Character</h3>
        <Badge className="bg-blue-50 text-blue-700 hover:bg-primary hover:text-white transition-colors border-blue-200">
          In Progress
        </Badge>
      </div>

      <div className="space-y-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="character-prompt">
            Preview your character prompt
          </Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onResetPrompt}
              disabled={!useCustomCharacterPrompt}
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Reset to Default
            </Button>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-custom-prompt"
                checked={useCustomCharacterPrompt}
                onCheckedChange={(checked) => {
                  const isChecked = checked === true;
                  setUseCustomPrompt(isChecked);
                  if (!isChecked) {
                    setCharacterPrompt(defaultPrompt);
                  }
                }}
              />
              <Label htmlFor="use-custom-prompt" className="text-sm">
                Use Custom Prompt
              </Label>
            </div>
          </div>
        </div>
        <div className="flex bg-slate-50 rounded-lg border border-slate-200 p-4 relative">
          <Textarea
            id="character-prompt"
            value={characterPrompt}
            onChange={(e) => {
              setCharacterPrompt(e.target.value);
              if (!useCustomCharacterPrompt) {
                setUseCustomPrompt(true);
              }
            }}
            className="min-h-24 bg-transparent border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {useCustomCharacterPrompt
            ? "You're using a custom prompt. This will be used instead of the automatically generated one."
            : "This is the automatically generated prompt based on your character attributes."}
          {isEditing
            ? " Click the Update Character button to save your changes."
            : " Click the Create Character button to save your character."}
        </p>
      </div>
    </>
  );
}

// Navigation Component for Character Creation
export function CharacterCreationNavigation({
  currentStep,
  goToPreviousStep,
  goToNextStep,
  isCreating,
  isEditing,
  onCancel
}: {
  currentStep: number;
  goToPreviousStep: () => void;
  goToNextStep: () => void;
  isCreating: boolean;
  isEditing?: boolean;
  onCancel?: () => void;
}) {
  return (
    <div className="mt-8 flex flex-col gap-2">
      <div className="flex flex-row gap-2">
        {currentStep > 1 && (
          <Button
            variant="outline"
            onClick={goToPreviousStep}
            className="flex-1"
          >
            Back
          </Button>
        )}
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        )}
      </div>
      <Button onClick={goToNextStep} disabled={isCreating}>
        {isCreating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {isEditing ? "Updating..." : "Creating..."}
          </>
        ) : currentStep === 4 ? (
          isEditing ? (
            "Update Character"
          ) : (
            "Create Character"
          )
        ) : (
          "Continue"
        )}
      </Button>
    </div>
  );
}

// Secondary Content Component
export function SecondaryContent() {
  return (
    <div className="mt-6 border rounded-xl border-slate-200 bg-white py-5 px-7">
      <div className="flex items-center justify-between gap-3.5">
        <div>
          <h3 className="text-xl font-semibold">Generate Headshot</h3>
          <p className="text-sm text-muted-foreground">
            Create professional AI headshots using your character profile
          </p>
        </div>
        <Badge className="bg-[#F9FAFB] text-[#344054] border-[#EAECF0] hover:bg-[#F9FAFB] hover:text-[#344054] transition-colors rounded-md text-xs font-medium">
          Up Next
        </Badge>
      </div>
    </div>
  );
}

// Character Creation Closed Content Component
export function CharacterCreationClosedContent({
  title = "Create Character",
  onClick
}: {
  title?: string;
  onClick?: () => void;
}) {
  const containerClasses = onClick
    ? "mb-6 border rounded-xl border-slate-200 bg-white py-5 px-7 cursor-pointer hover:border-slate-300 transition-colors"
    : "mb-6 border rounded-xl border-slate-200 bg-white py-5 px-7";

  return (
    <div className={containerClasses} onClick={onClick}>
      <div className="flex items-center justify-between gap-3.5">
        <h3 className="text-xl font-semibold">{title}</h3>
        <Badge className="bg-[#F9FAFB] text-[#344054] border-[#EAECF0] px-2 py-0.5 rounded-md text-xs font-medium">
          Previous
        </Badge>
      </div>
    </div>
  );
}
