import React, {useState, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {Tabs, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Card} from "@/components/ui/card";
import {cn} from "@/lib/utils";
import {Loader2, ChevronRight, RotateCcw} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {CharacterService} from "@/lib/services/character-service";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";

// Constants
const STEPS = [
  {id: 1, label: "Background"},
  {id: 2, label: "Lighting"},
  {id: 3, label: "Style"},
  {id: 4, label: "Prompt"}
];

const BACKGROUND_OPTIONS = {
  studio: [
    {value: "white", label: "White Background"},
    {value: "black", label: "Black Background"},
    {value: "gradient", label: "Gradient Background"},
    {value: "textured", label: "Textured Background"}
  ],
  office: [
    {value: "modern-office", label: "Modern Office"},
    {value: "executive-suite", label: "Executive Suite"},
    {value: "conference-room", label: "Conference Room"},
    {value: "coworking-space", label: "Co-working Space"},
    {value: "window-view", label: "Window View"},
    {value: "library", label: "Library"}
  ],
  outdoors: [
    {value: "beach", label: "Beach"},
    {value: "forest", label: "Forest"},
    {value: "mountain", label: "Mountain"},
    {value: "urban-street", label: "Urban Street"},
    {value: "park", label: "Park"}
  ],
  fun: [
    {value: "throne", label: "Throne with Crown"},
    {value: "funky", label: "Funky Colorful Room"},
    {value: "pyramids", label: "In Front of Pyramids"},
    {value: "superhero", label: "Superhero City Skyline"},
    {value: "underwater", label: "Underwater Fantasy"}
  ]
};

// Function to get background image path
const getBackgroundImagePath = (imageName: string): string => {
  return `/backgrounds/headshot-bg/${imageName}.png`;
};

const LIGHTING_OPTIONS = [
  {value: "natural", label: "Natural"},
  {value: "studio", label: "Studio"},
  {value: "dramatic", label: "Dramatic"},
  {value: "soft", label: "Soft"},
  {value: "golden-hour", label: "Golden Hour"}
];

const EXPRESSION_OPTIONS = [
  {value: "neutral", label: "Neutral"},
  {value: "slight-smile", label: "Slight Smile"},
  {value: "broad-smile", label: "Broad Smile"},
  {value: "laughing", label: "Laughing"},
  {value: "serious", label: "Serious"},
  {value: "thoughtful", label: "Thoughtful"},
  {value: "confident", label: "Confident"},
  {value: "professional", label: "Professional"}
];

const CLOTHING_OPTIONS = [
  {value: "professional", label: "Professional"},
  {value: "casual", label: "Casual / Street Clothes"},
  {value: "business-casual", label: "Business Casual"},
  {value: "suit", label: "Suit"},
  {value: "black-tie", label: "Black Tie"},
  {value: "creative", label: "Creative Professional"}
];

// Interfaces
export interface HeadshotSettingsProps {
  characterId: string;
  onGenerate: (options: HeadshotOptions) => void;
  isGenerating: boolean;
}

export interface HeadshotOptions {
  setting: string;
  lighting: string;
  expression: string;
  clothing: string;
  settingCategory: string;
  characterPrompt: string;
  useCustomCharacterPrompt?: boolean;
  useCustomHeadshotPrompt?: boolean;
  customPrompt?: string;
}

// Reusable Components
const SectionHeader = ({
  title,
  subtitle
}: {
  title: string;
  subtitle?: string;
}) => (
  <div className="mb-6 text-center">
    <h3 className="font-semibold text-xl">{title}</h3>
    {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
  </div>
);

const OptionCard = ({
  label,
  selected,
  onClick,
  imageSrc,
  isBackgroundImage = false
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  imageSrc?: string;
  isBackgroundImage?: boolean;
}) => (
  <div
    className={cn(
      "flex flex-col rounded-lg cursor-pointer transition-all overflow-hidden border border-slate-200",
      selected
        ? "border-primary shadow-md ring-2 ring-primary ring-opacity-20"
        : "hover:border-slate-300"
    )}
    onClick={onClick}
  >
    <div
      className={cn(
        "flex items-center justify-center w-full aspect-[4/3] border-b border-slate-200 relative",
        selected ? "bg-slate-50" : "bg-slate-100"
      )}
    >
      {imageSrc && isBackgroundImage ? (
        <div
          className="w-full h-full bg-cover bg-center bg-no-repeat rounded-t-lg"
          style={{
            backgroundImage: `url(${imageSrc})`
          }}
        />
      ) : imageSrc ? (
        <img src={imageSrc} alt={label} className="h-12 w-12 object-contain" />
      ) : (
        <div className="h-12 w-12 flex items-center justify-center">
          <span className="text-slate-400">{label.charAt(0)}</span>
        </div>
      )}
    </div>
    <div className="p-2 text-center">
      <span className="text-sm font-medium">{label}</span>
    </div>
  </div>
);

const StepSelection = ({
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
}) => {
  const isOpen = id ? openSections.includes(id) : false;

  const handleHeaderClick = () => {
    if (id && setOpenSections) {
      setOpenSections(
        isOpen
          ? openSections.filter((secId) => secId !== id)
          : [...openSections, id]
      );
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
        <div className="py-1 m-1">{children}</div>
      </div>
    </div>
  );
};

const StepIndicator = ({currentStep}: {currentStep: number}) => (
  <div className="my-8 max-w-3xl mx-auto">
    <div className="grid grid-cols-4 w-full relative">
      <div className="absolute top-[5px] left-[calc(25%-50px)] right-[calc(25%-50px)] md:left-[96px] md:right-[96px] h-0.5 z-0">
        <div className="absolute h-0.5 bg-muted w-full" />
        <div
          className="absolute h-0.5 bg-primary transition-all duration-300 ease-in-out"
          style={{
            width:
              currentStep === 1
                ? "0%"
                : `${Math.min(100, ((currentStep - 1) / (STEPS.length - 1)) * 100)}%`
          }}
        />
      </div>

      {STEPS.map((step) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;

        return (
          <div key={step.id} className="flex flex-col items-center z-10">
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

const SelectableCardGrid = ({
  options,
  selected,
  onSelect,
  cols = "grid-cols-2 md:grid-cols-4"
}: {
  options: {value: string; label: string}[];
  selected: string | null;
  onSelect: (value: string) => void;
  cols?: string;
}) => (
  <div className={`grid ${cols} gap-4`}>
    {options.map((option) => (
      <Card
        key={option.value}
        className={cn(
          "p-4 cursor-pointer transition-all border-2",
          selected === option.value
            ? "border-primary bg-primary/5"
            : "border-slate-200 hover:border-slate-300"
        )}
        onClick={() => onSelect(option.value)}
      >
        <div className="text-sm font-medium text-center">{option.label}</div>
      </Card>
    ))}
  </div>
);

// Step Components
const BackgroundStep = ({
  currentTab,
  setCurrentTab,
  selectedSetting,
  setSelectedSetting
}: {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  selectedSetting: string | null;
  setSelectedSetting: (setting: string) => void;
}) => (
  <>
    <SectionHeader
      title="Choose a background"
      subtitle="Select the type of background and setting for your headshot"
    />

    <Tabs
      defaultValue={currentTab}
      className="w-full mb-6"
      onValueChange={setCurrentTab}
    >
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="studio">Studio</TabsTrigger>
        <TabsTrigger value="office">Office</TabsTrigger>
        <TabsTrigger value="outdoors">Outdoors</TabsTrigger>
        <TabsTrigger value="fun">Fun</TabsTrigger>
      </TabsList>
    </Tabs>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {BACKGROUND_OPTIONS[currentTab as keyof typeof BACKGROUND_OPTIONS].map(
        (setting) => (
          <OptionCard
            key={setting.value}
            label={setting.label}
            selected={selectedSetting === setting.value}
            onClick={() => setSelectedSetting(setting.value)}
            imageSrc={getBackgroundImagePath(setting.value)}
            isBackgroundImage={true}
          />
        )
      )}
    </div>
  </>
);

const LightingStep = ({
  selectedLighting,
  setSelectedLighting
}: {
  selectedLighting: string | null;
  setSelectedLighting: (lighting: string) => void;
}) => (
  <>
    <SectionHeader
      title="Select lighting style"
      subtitle="The lighting dramatically affects the mood of your headshot"
    />
    <SelectableCardGrid
      options={LIGHTING_OPTIONS}
      selected={selectedLighting}
      onSelect={setSelectedLighting}
    />
  </>
);

const StyleStep = ({
  selectedExpression,
  setSelectedExpression,
  selectedClothing,
  setSelectedClothing,
  openSections,
  setOpenSections
}: {
  selectedExpression: string;
  setSelectedExpression: (expression: string) => void;
  selectedClothing: string | null;
  setSelectedClothing: (clothing: string) => void;
  openSections: string[];
  setOpenSections: (sections: string[]) => void;
}) => (
  <>
    <SectionHeader
      title="Choose your style"
      subtitle="Select your facial expression and clothing style"
    />

    <StepSelection
      title="Facial Expression"
      id="expression"
      openSections={openSections}
      setOpenSections={setOpenSections}
      hasChevron={true}
    >
      <SelectableCardGrid
        options={EXPRESSION_OPTIONS}
        selected={selectedExpression}
        onSelect={(value) => {
          setSelectedExpression(value);
          setOpenSections([
            ...openSections.filter((s) => s !== "expression"),
            "clothing"
          ]);
        }}
      />
    </StepSelection>

    <StepSelection
      title="Clothing Style"
      id="clothing"
      openSections={openSections}
      setOpenSections={setOpenSections}
      hasChevron={true}
    >
      <SelectableCardGrid
        options={CLOTHING_OPTIONS}
        selected={selectedClothing}
        onSelect={setSelectedClothing}
        cols="grid-cols-2 md:grid-cols-3"
      />
    </StepSelection>
  </>
);

const HeadshotPromptReviewStep = ({
  headshotPrompt,
  setHeadshotPrompt,
  isCustomHeadshotPrompt,
  setIsCustomHeadshotPrompt,
  onResetPrompt
}: {
  headshotPrompt: string;
  setHeadshotPrompt: (prompt: string) => void;
  isCustomHeadshotPrompt: boolean;
  setIsCustomHeadshotPrompt: (isCustom: boolean) => void;
  onResetPrompt: () => void;
}) => (
  <>
    <SectionHeader
      title="Customize your headshot prompt"
      subtitle="We'll use these details to generate your perfect headshot"
    />

    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <Label htmlFor="headshot-prompt">Headshot prompt</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={onResetPrompt}
          disabled={!isCustomHeadshotPrompt}
        >
          <RotateCcw className="h-3 w-3 mr-1" /> Reset to Default
        </Button>
      </div>
      <div className="flex bg-slate-50 rounded-lg border border-slate-200 p-4 relative">
        <Textarea
          id="headshot-prompt"
          value={headshotPrompt}
          onChange={(e) => {
            setHeadshotPrompt(e.target.value);
            setIsCustomHeadshotPrompt(true);
          }}
          className="min-h-24 bg-transparent border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder="Female, 34 years old, with Long Light Brown hair with Blonde highlights, Olive skin tone, wearing a Creative style outfit, expressing a Confident look..."
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {isCustomHeadshotPrompt
          ? "You've customized the prompt. Click 'Reset to Default' to revert to the auto-generated prompt."
          : "This is the automatically generated prompt based on your character and headshot settings."}
      </p>
    </div>
  </>
);

const Navigation = ({
  currentStep,
  goToPreviousStep,
  goToNextStep,
  isGenerating,
  canProceed
}: {
  currentStep: number;
  goToPreviousStep: () => void;
  goToNextStep: () => void;
  isGenerating: boolean;
  canProceed: boolean;
}) => (
  <div className="mt-8 flex flex-col gap-2">
    {currentStep > 1 && (
      <Button variant="outline" onClick={goToPreviousStep} className="mr-2">
        Back
      </Button>
    )}
    <Button onClick={goToNextStep} disabled={isGenerating || !canProceed}>
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : currentStep === 4 ? (
        "Generate Headshot"
      ) : (
        "Continue"
      )}
    </Button>
  </div>
);

// Main Component
export function HeadshotSettings({
  characterId,
  onGenerate,
  isGenerating
}: HeadshotSettingsProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [openSections, setOpenSections] = useState(["expression"]);
  const [settings, setSettings] = useState({
    tab: "studio" as string,
    setting: null as string | null,
    lighting: null as string | null,
    expression: "neutral" as string,
    clothing: null as string | null
  });

  const [prompts, setPrompts] = useState({
    character: "",
    base: "",
    headshot: "",
    settings: "",
    isCustomCharacter: false,
    isCustomHeadshot: false
  });

  // Fetch character data
  useEffect(() => {
    const fetchCharacterData = async () => {
      try {
        const character = await CharacterService.getCharacter(characterId);
        const customPrompt = `${character.customPrompt} ${prompts.settings}`;

        setPrompts({
          ...prompts,
          character: character.customPrompt,
          base: customPrompt,
          headshot: customPrompt,
          isCustomCharacter: !!character.useCustomCharacterPrompt,
          isCustomHeadshot: !!character.useCustomHeadshotPrompt
        });
      } catch (error) {
        console.error("Failed to fetch character data:", error);
      }
    };

    fetchCharacterData();
  }, [characterId]);

  // Update headshot settings text and default prompt
  useEffect(() => {
    const {tab, setting, lighting, expression, clothing} = settings;

    if (!setting || !lighting || !expression || !clothing) return;

    const formattedExpression =
      expression.charAt(0).toUpperCase() + expression.slice(1);
    const newSettingsText = `${formattedExpression} expression in a ${tab} (${setting}) setting with ${lighting} lighting, wearing ${clothing} clothing.`;

    setPrompts((prev) => ({
      ...prev,
      settings: newSettingsText,
      headshot: `${prev.character} ${newSettingsText}`
    }));
  }, [settings, prompts.character]);

  const handleResetPrompt = () => {
    setPrompts((prev) => ({
      ...prev,
      headshot: `${prev.character} ${prev.settings}`,
      isCustomHeadshot: false
    }));
  };

  const handleGenerate = () => {
    const {tab, setting, lighting, expression, clothing} = settings;

    if (!setting || !lighting || !expression || !clothing) return;

    onGenerate({
      setting,
      lighting,
      expression,
      clothing,
      settingCategory: tab,
      characterPrompt: prompts.character,
      useCustomCharacterPrompt: prompts.isCustomCharacter,
      customPrompt: prompts.isCustomHeadshot ? prompts.headshot : undefined,
      useCustomHeadshotPrompt: prompts.isCustomHeadshot
    });
  };

  const canProceed = () => {
    const {setting, lighting, expression, clothing} = settings;

    switch (currentStep) {
      case 1:
        return !!setting;
      case 2:
        return !!lighting;
      case 3:
        return !!expression && !!clothing;
      case 4:
        return !!prompts.character.trim();
      default:
        return false;
    }
  };

  const goToNextStep = () => {
    if (currentStep === 4) {
      handleGenerate();
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 4));
    if (currentStep === 2) {
      setOpenSections(["expression"]);
    }
  };

  const goToPreviousStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BackgroundStep
            currentTab={settings.tab}
            setCurrentTab={(tab) => setSettings({...settings, tab})}
            selectedSetting={settings.setting}
            setSelectedSetting={(setting) =>
              setSettings({...settings, setting})
            }
          />
        );
      case 2:
        return (
          <LightingStep
            selectedLighting={settings.lighting}
            setSelectedLighting={(lighting) =>
              setSettings({...settings, lighting})
            }
          />
        );
      case 3:
        return (
          <StyleStep
            selectedExpression={settings.expression}
            setSelectedExpression={(expression) =>
              setSettings({...settings, expression})
            }
            selectedClothing={settings.clothing}
            setSelectedClothing={(clothing) =>
              setSettings({...settings, clothing})
            }
            openSections={openSections}
            setOpenSections={setOpenSections}
          />
        );
      case 4:
        return (
          <HeadshotPromptReviewStep
            headshotPrompt={prompts.headshot}
            setHeadshotPrompt={(headshot) => setPrompts({...prompts, headshot})}
            isCustomHeadshotPrompt={prompts.isCustomHeadshot}
            setIsCustomHeadshotPrompt={(isCustom) =>
              setPrompts({...prompts, isCustomHeadshot: isCustom})
            }
            onResetPrompt={handleResetPrompt}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <StepIndicator currentStep={currentStep} />
      <div className="max-w-xl mx-auto pb-6">
        {renderStepContent()}
        <Navigation
          currentStep={currentStep}
          goToPreviousStep={goToPreviousStep}
          goToNextStep={goToNextStep}
          isGenerating={isGenerating}
          canProceed={canProceed()}
        />
      </div>
    </div>
  );
}

export function HeadshotCreationClosedContent() {
  return (
    <div className="mb-6 border rounded-xl border-slate-200 py-5 px-7">
      <div className="flex items-center justify-between gap-3.5">
        <h3 className="text-xl font-semibold">Generate Headshot</h3>
        <Badge className="bg-[#F9FAFB] text-[#344054] border-[#EAECF0] px-2 py-0.5 rounded-md text-xs font-medium">
          Previous
        </Badge>
      </div>
    </div>
  );
}
