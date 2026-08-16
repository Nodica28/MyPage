import {useAuth} from "@/hooks/use-auth";
import {Loader2} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {useQuery, useMutation} from "@tanstack/react-query";
import {useToast} from "@/hooks/use-toast";
import {queryClient, apiRequest} from "@/lib/queryClient";
// Removed AppShell and PageContainer imports to match other pages
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {z} from "zod";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Switch} from "@/components/ui/switch";
import {Textarea} from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";

const promptVarsSchema = z.object({
  lighting: z.object({
    types: z.record(z.string()), // e.g. "natural", "studio", "dramatic"
    backgrounds: z.record(z.string()).optional() // For custom backgrounds
  }),
  settings: z.object({
    office: z.record(z.string()),
    outdoors: z.record(z.string()),
    fun: z.record(z.string()),
    studio: z.record(z.string())
  }),
  expressions: z.object({
    professional: z.record(z.string()),
    friendly: z.record(z.string()),
    serious: z.record(z.string())
  }),
  clothing: z.object({
    business: z.record(z.string()),
    casual: z.record(z.string()),
    creative: z.record(z.string())
  })
});

// Add QR settings schema back
const qrSettingsSchema = z.object({
  transparent: z.boolean(),
  backColor: z.string(),
  frontColor: z.string(),
  markerOutColor: z.string(),
  markerInColor: z.string(),
  pattern: z.enum(["blob", "square", "circle", "diamond", "dot"]),
  marker: z.enum(["square", "circle", "diamond", "dot"]),
  markerIn: z.enum(["square", "circle", "diamond", "dot"]),
  outerFrame: z.enum(["none", "square", "circle", "diamond", "dot"]),
  optionLogo: z.string().optional(),
  noLogoBg: z.boolean()
});

// Main schema including both prompt vars and QR settings
const modelSettingsSchema = z.object({
  apiToken: z.string().min(1, "API token is required"),
  modelVisibility: z.enum(["public", "private"]),
  defaultPromptMale: z.string().min(1, "Male prompt is required"),
  defaultPromptFemale: z.string().min(1, "Female prompt is required"),
  defaultNegativePrompt: z.string(),
  aspectRatio: z.enum(["1:1", "4:5", "16:9", "3:2"]),
  characterWeight: z.number().min(0.1).max(1.0),
  model: z.enum([
    "JuggernautXL",
    "RealVisXL_V4.0_Lightning",
    "DreamShaperXL",
    "StableDiffusionXL"
  ]),
  stylePreset: z.enum(["Cinematic", "Studio", "Natural", "Artistic"]),
  quality: z.enum(["Standard", "Plus", "Max"]),
  sampler: z.enum([
    "DPM++ 2M Karras",
    "Euler A",
    "DPM++ SDE Karras",
    "DPM++ 2M SDE"
  ]),
  numInferenceSteps: z.number().int().min(1).max(150),
  guidanceScale: z.number().min(1).max(20),
  promptStrength: z.number().min(0).max(1),
  enhanceDetail: z.boolean(),
  outputFormat: z.enum(["webp", "png", "jpeg"]),
  outputQuality: z.number().int().min(1).max(100),
  promptVars: promptVarsSchema,
  qrSettings: qrSettingsSchema
});

type ModelSettingsForm = z.infer<typeof modelSettingsSchema>;

const defaultPromptVars2 = {
  hair: {
    colors: {
      brown: "rich chocolate brown hair",
      blonde: "golden blonde hair",
      black: "deep black hair",
      red: "vibrant auburn hair",
      gray: "distinguished silver hair"
    },
    styles: {
      straight: "sleek straight hair",
      wavy: "natural wavy hair",
      curly: "elegant curly hair"
    },
    lengths: {
      short: "short professional cut",
      medium: "medium-length styled hair",
      long: "long flowing hair"
    }
  },
  lighting: {
    types: {
      natural: "soft natural sunlight with perfect exposure",
      studio: "professional studio lighting setup",
      dramatic: "cinematic dramatic lighting"
    },
    backgrounds: {
      clean: "clean minimalist background",
      gradient: "smooth gradient background",
      textured: "subtle textured background"
    }
  },
  settings: {
    office: {
      modern: "modern corporate office environment",
      executive: "executive office setting",
      meeting: "professional meeting room"
    },
    outdoors: {
      urban: "urban professional environment",
      nature: "natural outdoor setting",
      architectural: "modern architecture background"
    },
    fun: {
      creative: "creative company environment",
      lifestyle: "lifestyle setting",
      casual: "casual modern setting"
    },
    studio: {
      neutral: "neutral studio backdrop",
      gradient: "professional gradient background",
      minimalist: "clean minimalist studio setting"
    }
  },
  expressions: {
    professional: {
      confident: "confident and approachable expression",
      composed: "composed professional look",
      engaged: "engaged and attentive expression"
    },
    friendly: {
      warm: "warm and approachable smile",
      natural: "natural friendly expression",
      welcoming: "welcoming and authentic smile"
    },
    serious: {
      focused: "focused and determined expression",
      thoughtful: "thoughtful and contemplative look",
      authoritative: "authoritative professional expression"
    }
  },
  clothing: {
    business: {
      suit: "tailored business suit",
      professional: "professional business attire",
      executive: "executive business wear"
    },
    casual: {
      smart: "smart casual professional attire",
      modern: "modern business casual",
      relaxed: "relaxed professional look"
    },
    creative: {
      stylish: "stylish creative professional wear",
      contemporary: "contemporary creative attire",
      artistic: "artistic professional style"
    }
  }
};

export default function SuperAdmin() {
  const {user} = useAuth();
  const {toast} = useToast();

  const {data: modelSettings, isLoading} = useQuery<ModelSettingsForm>({
    queryKey: ["/api/admin/settings"],
    enabled: !!user
  });

  const form = useForm<ModelSettingsForm>({
    resolver: zodResolver(modelSettingsSchema),
    defaultValues: {
      apiToken: modelSettings?.apiToken ?? "",
      modelVisibility: modelSettings?.modelVisibility ?? "public",
      defaultPromptMale: modelSettings?.defaultPromptMale ?? "",
      defaultPromptFemale: modelSettings?.defaultPromptFemale ?? "",
      defaultNegativePrompt: modelSettings?.defaultNegativePrompt ?? "",
      aspectRatio: modelSettings?.aspectRatio ?? "1:1",
      characterWeight: modelSettings?.characterWeight ?? 0.6,
      model: modelSettings?.model ?? "JuggernautXL",
      stylePreset: modelSettings?.stylePreset ?? "Cinematic",
      quality: modelSettings?.quality ?? "Plus",
      sampler: modelSettings?.sampler ?? "DPM++ 2M Karras",
      numInferenceSteps: modelSettings?.numInferenceSteps ?? 30,
      guidanceScale: modelSettings?.guidanceScale ?? 7.5,
      promptStrength: modelSettings?.promptStrength ?? 0.8,
      enhanceDetail: modelSettings?.enhanceDetail ?? true,
      outputFormat: modelSettings?.outputFormat ?? "webp",
      outputQuality: modelSettings?.outputQuality ?? 100,
      promptVars: modelSettings?.promptVars ?? defaultPromptVars2,
      qrSettings: {
        transparent: modelSettings?.qrSettings?.transparent ?? true,
        backColor: modelSettings?.qrSettings?.backColor ?? "#ffffff",
        frontColor: modelSettings?.qrSettings?.frontColor ?? "#4E5BA6",
        markerOutColor: modelSettings?.qrSettings?.markerOutColor ?? "#4E5BA6",
        markerInColor: modelSettings?.qrSettings?.markerInColor ?? "#4E5BA6",
        pattern: modelSettings?.qrSettings?.pattern ?? "blob",
        marker: modelSettings?.qrSettings?.marker ?? "circle",
        markerIn: modelSettings?.qrSettings?.markerIn ?? "circle",
        outerFrame: modelSettings?.qrSettings?.outerFrame ?? "none",
        optionLogo:
          modelSettings?.qrSettings?.optionLogo ??
          "https://cdn.prod.website-files.com/66f4393597ffdb07ccc556de/67c6014a896a0a0b84d06e2b_QR%20Code.png",
        noLogoBg: modelSettings?.qrSettings?.noLogoBg ?? false
      }
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: ModelSettingsForm) => {
      const res = await apiRequest("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update settings");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["/api/admin/settings"]});
      toast({
        title: "Settings updated",
        description: "Model settings have been updated successfully."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: ModelSettingsForm) => {
    updateSettingsMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-48px)]">
      <div className="flex flex-col border-2 sm:rounded-2xl h-full flex-grow">
        {/* Header */}
        <div className="py-3 px-4 flex flex-row items-center justify-between border-b-2">
          <div>
            <h2 className="text-lg font-medium">RenderNet Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure RenderNet API settings and generation parameters
            </p>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col px-7 py-4 border-y-0 flex-grow overflow-y-auto">
          <div className="space-y-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* API Settings Card */}
              <Card>
                <CardHeader>
                  <CardTitle>API Settings</CardTitle>
                  <CardDescription>
                    Configure RenderNet API access and basic settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="apiToken"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>API Token</FormLabel>
                        <FormControl>
                          <Input
                            value={String(field.value)}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            type="password"
                            placeholder="Enter your RenderNet API token"
                          />
                        </FormControl>
                        <FormDescription>
                          Your RenderNet API token for accessing the service
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Generation Settings Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Generation Settings</CardTitle>
                  <CardDescription>
                    Configure image generation parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="model"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Base Model</FormLabel>
                          <Select onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a model" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="JuggernautXL">
                                Juggernaut XL
                              </SelectItem>
                              <SelectItem value="RealVisXL_V4.0_Lightning">
                                RealVis XL V4.0
                              </SelectItem>
                              <SelectItem value="DreamShaperXL">
                                DreamShaper XL
                              </SelectItem>
                              <SelectItem value="StableDiffusionXL">
                                Stable Diffusion XL
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select the base model for image generation
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="stylePreset"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Style Preset</FormLabel>
                          <Select onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a style" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Cinematic">
                                Cinematic
                              </SelectItem>
                              <SelectItem value="Studio">Studio</SelectItem>
                              <SelectItem value="Natural">Natural</SelectItem>
                              <SelectItem value="Artistic">Artistic</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose the visual style preset
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="characterWeight"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Character Weight</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step={0.1}
                              min={0.1}
                              max={1.0}
                              value={String(field.value)}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value))
                              }
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormDescription>
                            Character fidelity strength (0.1-1.0)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="aspectRatio"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Aspect Ratio</FormLabel>
                          <Select onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select aspect ratio" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1:1">Square (1:1)</SelectItem>
                              <SelectItem value="4:5">
                                Portrait (4:5)
                              </SelectItem>
                              <SelectItem value="16:9">
                                Landscape (16:9)
                              </SelectItem>
                              <SelectItem value="3:2">
                                Standard (3:2)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose the output image aspect ratio
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="defaultPromptMale"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Default Male Prompt</FormLabel>
                          <FormControl>
                            <Textarea
                              value={String(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              className="min-h-[100px] font-mono text-sm"
                              placeholder="Enter the default prompt for male subjects"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="defaultPromptFemale"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Default Female Prompt</FormLabel>
                          <FormControl>
                            <Textarea
                              value={String(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              className="min-h-[100px] font-mono text-sm"
                              placeholder="Enter the default prompt for female subjects"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="defaultNegativePrompt"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Default Negative Prompt</FormLabel>
                          <FormControl>
                            <Input
                              value={String(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              placeholder="Enter default negative prompt"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="promptStrength"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Prompt Strength</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step={0.1}
                              min={0}
                              max={1}
                              value={String(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormDescription>
                            Control prompt influence (0-1)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="numInferenceSteps"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Inference Steps</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={150}
                              value={String(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormDescription>
                            Number of denoising steps (1-150)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="guidanceScale"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Guidance Scale</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step={0.1}
                              min={1}
                              max={20}
                              value={String(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormDescription>
                            How closely to follow the prompt (1-20)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="outputQuality"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Output Quality</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              value={String(field.value)}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormDescription>
                            Image quality percentage (1-100)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="enhanceDetail"
                    render={({field}) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Enhance Detail</FormLabel>
                          <FormDescription>
                            Improve overall image quality and details
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="outputFormat"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Output Format</FormLabel>
                          <Select onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select format" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="webp">WebP</SelectItem>
                              <SelectItem value="png">PNG</SelectItem>
                              <SelectItem value="jpeg">JPEG</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose the output image format
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Prompt Variables Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Prompt Variables</CardTitle>
                  <CardDescription>
                    Customize how different attributes are represented in the
                    final prompt
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="lighting" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="lighting">Lighting</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                      <TabsTrigger value="expressions">Expressions</TabsTrigger>
                      <TabsTrigger value="clothing">Clothing</TabsTrigger>
                    </TabsList>

                    <TabsContent value="lighting" className="space-y-6">
                      {/* Lighting Types */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">
                          Lighting Types
                        </h3>
                        {Object.entries(
                          form.getValues().promptVars.lighting.types
                        ).map(([key]) => (
                          <FormField
                            key={key}
                            control={form.control}
                            name={`promptVars.lighting.types.${key}` as any}
                            render={({field}) => (
                              <FormItem>
                                <FormLabel className="capitalize">
                                  {key} Lighting
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    value={field.value as string}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>

                      {/* Backgrounds */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Backgrounds</h3>
                        {Object.entries(
                          form.getValues().promptVars.lighting.backgrounds || {}
                        ).map(([key]) => (
                          <FormField
                            key={key}
                            control={form.control}
                            name={
                              `promptVars.lighting.backgrounds.${key}` as any
                            }
                            render={({field}) => (
                              <FormItem>
                                <FormLabel className="capitalize">
                                  {key} Background
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    value={field.value as string}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-6">
                      {Object.entries(form.getValues().promptVars.settings).map(
                        ([category, settings]) => (
                          <div key={category} className="space-y-4">
                            <h3 className="text-lg font-semibold capitalize">
                              {category} Settings
                            </h3>
                            {Object.entries(settings).map(([key]) => (
                              <FormField
                                key={key}
                                control={form.control}
                                name={
                                  `promptVars.settings.${category}.${key}` as any
                                }
                                render={({field}) => (
                                  <FormItem>
                                    <FormLabel className="capitalize">
                                      {key} Setting
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        value={field.value as string}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        name={field.name}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        )
                      )}
                    </TabsContent>

                    <TabsContent value="expressions" className="space-y-6">
                      {Object.entries(
                        form.getValues().promptVars.expressions
                      ).map(([category, expressions]) => (
                        <div key={category} className="space-y-4">
                          <h3 className="text-lg font-semibold capitalize">
                            {category} Expressions
                          </h3>
                          {Object.entries(expressions).map(([key]) => (
                            <FormField
                              key={key}
                              control={form.control}
                              name={
                                `promptVars.expressions.${category}.${key}` as any
                              }
                              render={({field}) => (
                                <FormItem>
                                  <FormLabel className="capitalize">
                                    {key} Expression
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      value={field.value as string}
                                      onChange={field.onChange}
                                      onBlur={field.onBlur}
                                      name={field.name}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="clothing" className="space-y-6">
                      {Object.entries(form.getValues().promptVars.clothing).map(
                        ([category, clothing]) => (
                          <div key={category} className="space-y-4">
                            <h3 className="text-lg font-semibold capitalize">
                              {category} Clothing
                            </h3>
                            {Object.entries(clothing).map(([key]) => (
                              <FormField
                                key={key}
                                control={form.control}
                                name={
                                  `promptVars.clothing.${category}.${key}` as any
                                }
                                render={({field}) => (
                                  <FormItem>
                                    <FormLabel className="capitalize">
                                      {key} Style
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        value={field.value as string}
                                        onChange={field.onChange}
                                        onBlur={field.onBlur}
                                        name={field.name}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        )
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* QR Code Settings Card */}
              <Card>
                <CardHeader>
                  <CardTitle>QR Code Settings</CardTitle>
                  <CardDescription>
                    Configure the default appearance of generated QR codes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="qrSettings.transparent"
                    render={({field}) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Transparent Background</FormLabel>
                          <FormDescription>
                            Enable transparent background for QR codes
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="qrSettings.backColor"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Background Color</FormLabel>
                          <FormControl>
                            <Input type="color" {...field} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="qrSettings.frontColor"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Foreground Color</FormLabel>
                          <FormControl>
                            <Input type="color" {...field} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="qrSettings.markerOutColor"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Marker Outer Color</FormLabel>
                          <FormControl>
                            <Input type="color" {...field} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="qrSettings.markerInColor"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Marker Inner Color</FormLabel>
                          <FormControl>
                            <Input type="color" {...field} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="qrSettings.pattern"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Pattern Style</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select pattern style" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="blob">Blob</SelectItem>
                              <SelectItem value="square">Square</SelectItem>
                              <SelectItem value="circle">Circle</SelectItem>
                              <SelectItem value="diamond">Diamond</SelectItem>
                              <SelectItem value="dot">Dot</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="qrSettings.marker"
                      render={({field}) => (
                        <FormItem>
                          <FormLabel>Marker Style</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select marker style" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="square">Square</SelectItem>
                              <SelectItem value="circle">Circle</SelectItem>
                              <SelectItem value="diamond">Diamond</SelectItem>
                              <SelectItem value="dot">Dot</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="qrSettings.optionLogo"
                    render={({field}) => (
                      <FormItem>
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter logo URL" />
                        </FormControl>
                        <FormDescription>
                          URL of the logo to be placed in the center of QR codes
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="qrSettings.noLogoBg"
                    render={({field}) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Remove Logo Background</FormLabel>
                          <FormDescription>
                            Remove the background from the logo
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end mt-8">
                <Button
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                  className="w-full md:w-auto"
                >
                  {updateSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Settings"
                  )}
                </Button>
              </div>
            </form>
          </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
