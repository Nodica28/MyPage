export type HeadshotOptions = {
  gender: "male" | "female" | "other";
  age?: number;
  skinTone?: string;
  highlights?: string;
  hairLength: "bald" | "very short" | "short" | "medium" | "long" | "very long";
  hairStyle:
    | "straight"
    | "wavy"
    | "curly"
    | "buzzcut"
    | "crew cut"
    | "fade"
    | "undercut"
    | "slicked back"
    | "braided"
    | "ponytail"
    | "bun"
    | "dreadlocks";
  hairColor:
    | "black"
    | "dark brown"
    | "brown"
    | "light brown"
    | "blonde"
    | "platinum blonde"
    | "red"
    | "auburn"
    | "gray"
    | "white"
    | "highlighted"
    | "blue"
    | "pink"
    | "purple";
  facialHairType?:
    | "none"
    | "stubble"
    | "mustache"
    | "goatee"
    | "van dyke"
    | "circle beard"
    | "full beard"
    | "chinstrap"
    | "mutton chops"
    | "soul patch";
  facialHairLength?:
    | "short"
    | "medium"
    | "long"
    | "very long"
    | "none"
    | "light";
  backgroundType: "office" | "outdoor" | "studio" | "special";
  backgroundDetail?: string;
  lightingType: "studio" | "special" | "natural";
  lightingDetail?: string;
  expression:
    | "neutral"
    | "slight smile"
    | "broad smile"
    | "laughing"
    | "serious"
    | "thoughtful"
    | "confident"
    | "determined"
    | "pensive"
    | "professional";
  // Additional fields used in promptService
  useCustomCharacterPrompt?: boolean;
  customPrompt?: string;
  useCustomHeadshotPrompt?: boolean;
  useCustomNegativePrompt?: boolean;
  customNegativePrompt?: string;
  settingCategory?: string;
  setting?: string;
  lighting?: string;
  clothing?: string;
};
