"use client";

import {useState, useEffect} from "react";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";
import {Button} from "@/components/ui/button";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Card, CardContent} from "@/components/ui/card";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {Trash2, Plus} from "lucide-react";
import {
  GlobalChatSettings,
  ChatPrompt,
  KnowledgeSource
} from "@shared/types/chat";
import {v4 as uuidv4} from "uuid";
import {UpgradeBadge} from "@/components/ui/upgrade-badge";

interface ChatSettingsEditorProps {
  settings: GlobalChatSettings | undefined;
  onChange: (settings: GlobalChatSettings) => void;
  subscriptionStatus?: string;
  planType?: string;
  hasPremiumAccess?: boolean;
}

export function ChatSettingsEditor({
  settings,
  onChange,
  subscriptionStatus,
  planType,
  hasPremiumAccess
}: ChatSettingsEditorProps) {
  // Check if user has premium access (subscription or beta tester)
  // Use hasPremiumAccess if provided, otherwise fall back to subscription check
  const isProPlan =
    hasPremiumAccess === true ||
    (subscriptionStatus === "active" && planType === "pro");

  // Default settings if none are provided
  const defaultSettings: GlobalChatSettings = {
    enabled: false,
    position: "bottom-right",
    bubbleText: "Chat with me",
    welcomeMessage: "Hello! How can I help you today?",
    chatSettings: {
      defaultPrompts: [
        {id: "default-1", text: "Tell me more about your services", order: 0},
        {id: "default-2", text: "What experience do you have?", order: 1},
        {id: "default-3", text: "How can we work together?", order: 2}
      ],
      knowledgeSources: [],
      includeProfileData: true,
      model: "o1-mini",
      systemPrompt:
        "You are a helpful assistant representing the profile owner. Answer questions based on their profile information."
    }
  };

  // Initialize with provided settings or defaults
  const [chatSettings, setChatSettings] = useState<GlobalChatSettings>(() => {
    if (settings) {
      return {
        ...defaultSettings,
        ...settings,
        enabled: settings.enabled === true,
        chatSettings: {
          ...defaultSettings.chatSettings,
          ...settings.chatSettings
        }
      };
    }
    return defaultSettings;
  });

  // Update local state when props change
  useEffect(() => {
    if (settings) {
      setChatSettings({
        ...defaultSettings,
        ...settings,
        enabled: settings.enabled === true,
        chatSettings: {
          ...defaultSettings.chatSettings,
          ...settings.chatSettings
        }
      });
    }
  }, [settings]);

  // Helper function to update settings and notify parent
  const updateSettings = (
    updater: (prev: GlobalChatSettings) => GlobalChatSettings
  ) => {
    setChatSettings((prev) => {
      const newSettings = updater(prev);
      onChange(newSettings);
      return newSettings;
    });
  };

  // Toggle the enabled state
  const handleToggleEnabled = (enabled: boolean) => {
    // Only allow enabling if user has pro plan
    if (enabled && !isProPlan) {
      return;
    }

    updateSettings((prev) => ({
      ...prev,
      enabled
    }));
  };

  // Update position setting
  const handlePositionChange = (
    position: "bottom-right" | "bottom-left" | "top-right" | "top-left"
  ) => {
    updateSettings((prev) => ({
      ...prev,
      position
    }));
  };

  // Update text fields
  const handleTextChange = (
    field: "bubbleText" | "welcomeMessage",
    value: string
  ) => {
    updateSettings((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle prompt changes
  const handleAddPrompt = () => {
    const newPrompt: ChatPrompt = {
      id: `prompt-${uuidv4()}`,
      text: "",
      order: chatSettings.chatSettings.defaultPrompts.length
    };

    updateSettings((prev) => ({
      ...prev,
      chatSettings: {
        ...prev.chatSettings,
        defaultPrompts: [...prev.chatSettings.defaultPrompts, newPrompt]
      }
    }));
  };

  const handleDeletePrompt = (id: string) => {
    updateSettings((prev) => ({
      ...prev,
      chatSettings: {
        ...prev.chatSettings,
        defaultPrompts: prev.chatSettings.defaultPrompts
          .filter((prompt) => prompt.id !== id)
          .map((prompt, index) => ({...prompt, order: index}))
      }
    }));
  };

  const handlePromptTextChange = (id: string, text: string) => {
    updateSettings((prev) => ({
      ...prev,
      chatSettings: {
        ...prev.chatSettings,
        defaultPrompts: prev.chatSettings.defaultPrompts.map((prompt) =>
          prompt.id === id ? {...prompt, text} : prompt
        )
      }
    }));
  };

  // Handle knowledge source changes
  const handleAddKnowledgeSource = () => {
    const newSource: KnowledgeSource = {
      id: `source-${uuidv4()}`,
      type: "url",
      content: ""
    };

    updateSettings((prev) => ({
      ...prev,
      chatSettings: {
        ...prev.chatSettings,
        knowledgeSources: [...prev.chatSettings.knowledgeSources, newSource]
      }
    }));
  };

  const handleDeleteKnowledgeSource = (id: string) => {
    updateSettings((prev) => ({
      ...prev,
      chatSettings: {
        ...prev.chatSettings,
        knowledgeSources: prev.chatSettings.knowledgeSources.filter(
          (source) => source.id !== id
        )
      }
    }));
  };

  const handleKnowledgeSourceChange = (
    id: string,
    field: "type" | "content" | "name",
    value: string
  ) => {
    updateSettings((prev) => ({
      ...prev,
      chatSettings: {
        ...prev.chatSettings,
        knowledgeSources: prev.chatSettings.knowledgeSources.map((source) =>
          source.id === id ? {...source, [field]: value} : source
        )
      }
    }));
  };

  // Handle includeProfileData toggle
  const handleToggleProfileData = (includeProfileData: boolean) => {
    updateSettings((prev) => ({
      ...prev,
      chatSettings: {
        ...prev.chatSettings,
        includeProfileData
      }
    }));
  };

  // Handle system prompt change
  const handleSystemPromptChange = (systemPrompt: string) => {
    updateSettings((prev) => ({
      ...prev,
      chatSettings: {
        ...prev.chatSettings,
        systemPrompt
      }
    }));
  };

  // Handle model change
  const handleModelChange = (model: string) => {
    updateSettings((prev) => ({
      ...prev,
      chatSettings: {
        ...prev.chatSettings,
        model
      }
    }));
  };

  return (
    <div>
      {/* Enable/Disable Chat */}
      <div className="flex items-center gap-6">
        <Switch
          id="enable-chat"
          checked={chatSettings.enabled}
          onCheckedChange={handleToggleEnabled}
          disabled={!isProPlan}
        />
        <div className="flex items-center gap-2 flex-1 justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="enable-chat" className="text-base font-medium">
              Enable AI Chat
            </Label>
            <p className="text-xs text-muted-foreground">
              Allow visitors to chat with an AI assistant on your profile
            </p>
          </div>
          {!isProPlan && <UpgradeBadge />}
        </div>
      </div>

      {/* Only show additional settings if chat is enabled */}
      {chatSettings.enabled && (
        <div className="border-t border-stone-200 bg-stone-50 p-5 -mx-5 -mb-5 mt-4">
          <Tabs defaultValue="appearance" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
              <TabsTrigger value="prompts">Prompts</TabsTrigger>
              <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
            </TabsList>

            <TabsContent value="appearance" className="space-y-4">
              {/* Position */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Chat Position</Label>
                <RadioGroup
                  value={chatSettings.position}
                  onValueChange={handlePositionChange}
                  className="grid grid-cols-2 gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bottom-right" id="bottom-right" />
                    <Label htmlFor="bottom-right" className="text-sm">
                      Bottom Right
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bottom-left" id="bottom-left" />
                    <Label htmlFor="bottom-left" className="text-sm">
                      Bottom Left
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="top-right" id="top-right" />
                    <Label htmlFor="top-right" className="text-sm">
                      Top Right
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="top-left" id="top-left" />
                    <Label htmlFor="top-left" className="text-sm">
                      Top Left
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Bubble Text */}
              <div className="space-y-2">
                <Label htmlFor="bubble-text" className="text-sm font-medium">
                  Chat Bubble Text
                </Label>
                <Input
                  id="bubble-text"
                  value={chatSettings.bubbleText}
                  onChange={(e) =>
                    handleTextChange("bubbleText", e.target.value)
                  }
                  placeholder="Chat with me"
                />
              </div>

              {/* Welcome Message */}
              <div className="space-y-2">
                <Label
                  htmlFor="welcome-message"
                  className="text-sm font-medium"
                >
                  Welcome Message
                </Label>
                <Textarea
                  id="welcome-message"
                  value={chatSettings.welcomeMessage}
                  onChange={(e) =>
                    handleTextChange("welcomeMessage", e.target.value)
                  }
                  placeholder="Hello! How can I help you today?"
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="prompts" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Default Prompts</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddPrompt}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Prompt
                  </Button>
                </div>

                <div className="space-y-2">
                  {chatSettings.chatSettings.defaultPrompts.map((prompt) => (
                    <Card key={prompt.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={prompt.text}
                            onChange={(e) =>
                              handlePromptTextChange(prompt.id, e.target.value)
                            }
                            placeholder="Enter prompt text..."
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePrompt(prompt.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="knowledge" className="space-y-4">
              {/* Include Profile Data */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="include-profile"
                    className="text-sm font-medium"
                  >
                    Include Profile Data
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Include your profile information in chat responses
                  </p>
                </div>
                <Switch
                  id="include-profile"
                  checked={chatSettings.chatSettings.includeProfileData}
                  onCheckedChange={handleToggleProfileData}
                />
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">AI Model</Label>
                <RadioGroup
                  value={chatSettings.chatSettings.model}
                  onValueChange={handleModelChange}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="o1-mini" id="o1-mini" />
                    <Label htmlFor="o1-mini" className="text-sm">
                      O1 Mini (Recommended)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="gpt-4o" id="gpt-4o" />
                    <Label htmlFor="gpt-4o" className="text-sm">
                      GPT-4o
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="gpt-3.5-turbo" id="gpt-3.5-turbo" />
                    <Label htmlFor="gpt-3.5-turbo" className="text-sm">
                      GPT-3.5 Turbo
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* System Prompt */}
              <div className="space-y-2">
                <Label htmlFor="system-prompt" className="text-sm font-medium">
                  System Prompt
                </Label>
                <Textarea
                  id="system-prompt"
                  value={chatSettings.chatSettings.systemPrompt}
                  onChange={(e) => handleSystemPromptChange(e.target.value)}
                  placeholder="You are a helpful assistant..."
                  rows={4}
                />
              </div>

              {/* Knowledge Sources */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Knowledge Sources
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddKnowledgeSource}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Source
                  </Button>
                </div>

                <div className="space-y-2">
                  {chatSettings.chatSettings.knowledgeSources.map((source) => (
                    <Card key={source.id}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <RadioGroup
                            value={source.type}
                            onValueChange={(value) =>
                              handleKnowledgeSourceChange(
                                source.id,
                                "type",
                                value
                              )
                            }
                            className="flex gap-4"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="url"
                                id={`url-${source.id}`}
                              />
                              <Label
                                htmlFor={`url-${source.id}`}
                                className="text-sm"
                              >
                                URL
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="text"
                                id={`text-${source.id}`}
                              />
                              <Label
                                htmlFor={`text-${source.id}`}
                                className="text-sm"
                              >
                                Text
                              </Label>
                            </div>
                          </RadioGroup>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteKnowledgeSource(source.id)
                            }
                            className="text-red-500 hover:text-red-700 ml-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {source.type === "url" ? (
                          <Input
                            value={source.content}
                            onChange={(e) =>
                              handleKnowledgeSourceChange(
                                source.id,
                                "content",
                                e.target.value
                              )
                            }
                            placeholder="https://example.com"
                          />
                        ) : (
                          <Textarea
                            value={source.content}
                            onChange={(e) =>
                              handleKnowledgeSourceChange(
                                source.id,
                                "content",
                                e.target.value
                              )
                            }
                            placeholder="Enter your knowledge content..."
                            rows={3}
                          />
                        )}

                        <Input
                          value={source.name || ""}
                          onChange={(e) =>
                            handleKnowledgeSourceChange(
                              source.id,
                              "name",
                              e.target.value
                            )
                          }
                          placeholder="Source name (optional)"
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
