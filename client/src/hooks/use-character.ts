import {useEffect, useState} from "react";
import {CharacterService} from "@/lib/services/character-service";

export interface Character {
  id: number;
  userId: number;
  name: string;
  renderNetId: string;
  referenceImage: string;
  prompt: string;
  gender: string;
  age: number;
  hairStyle: string;
  hairLength: string;
  hairColor: string;
  highlights: string;
  skinTone: string;
  bodyBuild: string;
  facialHair?: string;
  customPrompt?: string | null;
  useCustomCharacterPrompt?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UseCharacterOptions {
  enabled?: boolean;
}

export function useCharacter(options: UseCharacterOptions = {}) {
  const {enabled = true} = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);

  const fetchCharacter = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch the user's characters (assuming the first one is the active one)
      const characters = await CharacterService.getUserCharacters();

      if (characters && characters.length > 0) {
        // Use the first character
        setCharacter(characters[0]);
      } else {
        setCharacter(null);
      }
    } catch (err) {
      console.error("Failed to fetch character:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to fetch character")
      );
      setCharacter(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchCharacter();
    }
  }, [enabled]);

  return {
    character,
    isLoading,
    error,
    refetch: fetchCharacter
  };
}
