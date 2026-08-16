import React, {useState} from "react";
import {Card} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {useAuth} from "@/hooks/use-auth";
import {Input} from "@/components/ui/input";
import {Switch} from "@/components/ui/switch";
import {Label} from "@/components/ui/label";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import {
  LayoutTemplate,
  LayoutGrid,
  Mail,
  Copy,
  AlertCircle,
  ImageIcon,
  Building2,
  Globe,
  Send,
  LinkedinIcon,
  Sparkles,
  CheckCircle2
} from "lucide-react";
import {Link} from "wouter";

type Template = {
  id: string;
  name: string;
  icon: typeof LayoutTemplate;
  description: string;
};

const TEMPLATES: Template[] = [
  {
    id: "minimal",
    name: "Minimal",
    icon: LayoutTemplate,
    description: "Clean and simple design with essential information"
  },
  {
    id: "professional",
    name: "Professional",
    icon: LayoutGrid,
    description: "Complete business card style with all details"
  },
  {
    id: "modern",
    name: "Modern",
    icon: Sparkles,
    description: "Contemporary design with QR code and social links"
  }
];

const QRCodePlaceholder = () => (
  <svg
    className="w-24 h-24"
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="100" height="100" rx="10" fill="#F3F4F6" />
    <path
      d="M25 25H45V45H25V25ZM55 25H75V45H55V25ZM25 55H45V75H25V55Z"
      fill="#D1D5DB"
    />
    <rect x="55" y="55" width="20" height="20" rx="2" fill="#D1D5DB" />
  </svg>
);

export default function EmailSignature() {
  const {user} = useAuth();
  const [currentStep, setCurrentStep] = useState<string>("step-1");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showProfileImage, setShowProfileImage] = useState(true);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    title: user?.title || "",
    email: user?.email || "",
    companyName: user?.companyName || "",
    companyWebsite: "",
    linkedIn: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {name, value} = e.target;
    setFormData((prev) => ({...prev, [name]: value}));
  };

  const handleStepChange = (value: string) => {
    setCurrentStep(value);
  };

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-6">Email Signature</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form Content */}
        <div className="lg:col-span-2 space-y-4">
          <Accordion
            type="single"
            collapsible
            value={currentStep}
            onValueChange={handleStepChange}
            className="space-y-4"
          >
            <AccordionItem
              value="step-1"
              className="border rounded-lg bg-white"
            >
              <AccordionTrigger className="px-4 py-3 md:px-6 md:py-4 hover:no-underline data-[state=open]:border-b">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-primary/10">
                    <LayoutTemplate className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="text-base md:text-lg font-medium">
                      1. Select Template
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">
                      Choose your signature style
                    </div>
                  </div>
                  {selectedTemplate && (
                    <CheckCircle2 className="ml-auto h-4 w-4 md:h-5 md:w-5 text-primary" />
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 md:p-6 pt-6 md:pt-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {TEMPLATES.map((template) => (
                    <Card
                      key={template.id}
                      className={`relative cursor-pointer overflow-hidden p-4 md:p-6 transition-all hover:ring-2 hover:ring-primary/50 ${
                        selectedTemplate === template.id
                          ? "ring-2 ring-primary bg-primary/5"
                          : "bg-white"
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <div className="flex flex-col items-center text-center">
                        <template.icon className="h-6 w-6 md:h-8 md:w-8 mb-3 md:mb-4 text-primary" />
                        <h3 className="font-medium mb-1 md:mb-2">
                          {template.name}
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                      {selectedTemplate === template.id && (
                        <div className="absolute top-2 right-2 md:top-4 md:right-4">
                          <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
                <div className="mt-6 md:mt-8 flex justify-end">
                  <Button
                    onClick={() => handleStepChange("step-2")}
                    disabled={!selectedTemplate}
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    Continue to Personal Info
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="step-2"
              className="border rounded-lg bg-white"
            >
              <AccordionTrigger className="px-4 py-3 md:px-6 md:py-4 hover:no-underline data-[state=open]:border-b">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-primary/10">
                    <ImageIcon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="text-base md:text-lg font-medium">
                      2. Personal Information
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">
                      Customize your profile details
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 md:p-6 pt-6 md:pt-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b pb-4 md:pb-6">
                    <div className="flex items-center space-x-2">
                      <ImageIcon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      <Label htmlFor="show-profile-image">
                        Show Profile Picture
                      </Label>
                    </div>
                    <Switch
                      id="show-profile-image"
                      checked={showProfileImage}
                      onCheckedChange={setShowProfileImage}
                    />
                  </div>

                  {showProfileImage && (
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12 md:h-16 md:w-16">
                        <AvatarImage
                          src={user?.profileImage || ""}
                          alt={`${user?.firstName} ${user?.lastName}'s profile picture`}
                        />
                        <AvatarFallback>
                          {`${formData.firstName?.[0] || ""}${formData.lastName?.[0] || ""}`}
                        </AvatarFallback>
                      </Avatar>
                      <Link href="/settings/profile">
                        <Button variant="outline" size="sm" className="text-sm">
                          Change Photo
                        </Button>
                      </Link>
                    </div>
                  )}

                  {/* Personal Info Form Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="h-10 md:h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="h-10 md:h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Job Title</Label>
                    <Input
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="h-10 md:h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="h-10 md:h-11"
                    />
                  </div>
                </div>
                <div className="mt-6 md:mt-8 flex flex-col sm:flex-row justify-end gap-3 md:gap-4">
                  <Button
                    variant="outline"
                    onClick={() => handleStepChange("step-1")}
                    size="lg"
                    className="w-full sm:w-auto order-2 sm:order-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => handleStepChange("step-3")}
                    size="lg"
                    className="w-full sm:w-auto order-1 sm:order-2"
                  >
                    Continue to Company Details
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="step-3"
              className="border rounded-lg bg-white"
            >
              <AccordionTrigger className="px-4 py-3 md:px-6 md:py-4 hover:no-underline data-[state=open]:border-b">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-primary/10">
                    <Building2 className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="text-base md:text-lg font-medium">
                      3. Company Details
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">
                      Add your organization info
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 md:p-6 pt-6 md:pt-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className="h-10 md:h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyWebsite">Company Website</Label>
                    <Input
                      id="companyWebsite"
                      name="companyWebsite"
                      value={formData.companyWebsite}
                      onChange={handleInputChange}
                      placeholder="https://example.com"
                      className="h-10 md:h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedIn">LinkedIn Profile</Label>
                    <Input
                      id="linkedIn"
                      name="linkedIn"
                      value={formData.linkedIn}
                      onChange={handleInputChange}
                      placeholder="https://linkedin.com/in/yourprofile"
                      className="h-10 md:h-11"
                    />
                  </div>
                </div>
                <div className="mt-6 md:mt-8 flex flex-col sm:flex-row justify-end gap-3 md:gap-4">
                  <Button
                    variant="outline"
                    onClick={() => handleStepChange("step-2")}
                    size="lg"
                    className="w-full sm:w-auto order-2 sm:order-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => handleStepChange("step-4")}
                    size="lg"
                    className="w-full sm:w-auto order-1 sm:order-2"
                  >
                    Continue to Email Setup
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem
              value="step-4"
              className="border rounded-lg bg-white"
            >
              <AccordionTrigger className="px-4 py-3 md:px-6 md:py-4 hover:no-underline data-[state=open]:border-b">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-primary/10">
                    <Mail className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="text-base md:text-lg font-medium">
                      4. Email Setup
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">
                      Connect your email provider
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 md:p-6 pt-6 md:pt-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
                  <Card className="p-4 md:p-6 cursor-pointer hover:bg-accent/5 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Mail className="h-6 w-6 md:h-8 md:w-8 text-red-500" />
                      <div>
                        <h3 className="font-medium">Gmail</h3>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Connect with Google
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 md:p-6 cursor-pointer hover:bg-accent/5 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Building2 className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
                      <div>
                        <h3 className="font-medium">Outlook</h3>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Connect with Microsoft
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 md:p-6 cursor-pointer hover:bg-accent/5 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Globe className="h-6 w-6 md:h-8 md:w-8 text-gray-800" />
                      <div>
                        <h3 className="font-medium">Apple Mail</h3>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          View instructions
                        </p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 md:p-6 cursor-pointer hover:bg-accent/5 transition-colors">
                    <div className="flex items-center space-x-4">
                      <Send className="h-6 w-6 md:h-8 md:w-8 text-purple-500" />
                      <div>
                        <h3 className="font-medium">Other Email</h3>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          View instructions
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                <div className="mt-6 md:mt-8 flex items-center p-4 bg-accent/5 rounded-lg">
                  <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground mr-2" />
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Can't find your email provider? Copy the signature and add
                    it manually.
                  </p>
                </div>

                <div className="mt-6 md:mt-8 flex flex-col sm:flex-row justify-end gap-3 md:gap-4">
                  <Button
                    variant="outline"
                    onClick={() => handleStepChange("step-3")}
                    size="lg"
                    className="w-full sm:w-auto order-2 sm:order-1"
                  >
                    Back
                  </Button>
                  <Button
                    size="lg"
                    className="w-full sm:w-auto order-1 sm:order-2"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Signature
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-1">
          <Card className="overflow-hidden">
            <div className="p-4 md:p-6 bg-gray-50 border-b">
              <h3 className="font-medium text-base">Signature Preview</h3>
              <p className="text-sm text-muted-foreground">
                See how your signature will look
              </p>
            </div>
            <div className="p-4 md:p-6">
              {selectedTemplate ? (
                <div className="border rounded-md p-4 bg-white shadow-sm">
                  {selectedTemplate === "minimal" && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        {showProfileImage && (
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={user?.profileImage || ""} />
                            <AvatarFallback>{`${formData.firstName?.[0] || ""}${formData.lastName?.[0] || ""}`}</AvatarFallback>
                          </Avatar>
                        )}
                        <div>
                          <h3 className="font-medium">{`${formData.firstName} ${formData.lastName}`}</h3>
                          {formData.title && (
                            <p className="text-sm text-gray-600">
                              {formData.title}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="pt-2 text-sm">
                        <p>{formData.email}</p>
                        {formData.companyName && <p>{formData.companyName}</p>}
                      </div>
                    </div>
                  )}

                  {selectedTemplate === "professional" && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        {showProfileImage && (
                          <Avatar className="h-14 w-14">
                            <AvatarImage src={user?.profileImage || ""} />
                            <AvatarFallback>{`${formData.firstName?.[0] || ""}${formData.lastName?.[0] || ""}`}</AvatarFallback>
                          </Avatar>
                        )}
                        <div>
                          <h3 className="font-medium text-lg">{`${formData.firstName} ${formData.lastName}`}</h3>
                          {formData.title && (
                            <p className="text-sm text-gray-600">
                              {formData.title}
                            </p>
                          )}
                          {formData.companyName && (
                            <p className="text-sm font-medium">
                              {formData.companyName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-4 pt-2 text-sm">
                        <div>
                          <p className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" /> {formData.email}
                          </p>
                          {formData.companyWebsite && (
                            <p className="flex items-center">
                              <Globe className="h-4 w-4 mr-1" />{" "}
                              {formData.companyWebsite}
                            </p>
                          )}
                        </div>
                        {formData.linkedIn && (
                          <div>
                            <p className="flex items-center">
                              <LinkedinIcon className="h-4 w-4 mr-1" /> LinkedIn
                              Profile
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedTemplate === "modern" && (
                    <div className="flex justify-between">
                      <div className="space-y-3">
                        <div>
                          {showProfileImage && (
                            <Avatar className="h-16 w-16 mb-3">
                              <AvatarImage src={user?.profileImage || ""} />
                              <AvatarFallback>{`${formData.firstName?.[0] || ""}${formData.lastName?.[0] || ""}`}</AvatarFallback>
                            </Avatar>
                          )}
                          <h3 className="font-medium text-lg">{`${formData.firstName} ${formData.lastName}`}</h3>
                          {formData.title && (
                            <p className="text-sm text-gray-600">
                              {formData.title}
                            </p>
                          )}
                        </div>
                        <div className="pt-2 text-sm">
                          <p className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" /> {formData.email}
                          </p>
                          {formData.companyName && (
                            <p className="text-gray-600">
                              {formData.companyName}
                            </p>
                          )}
                          {formData.companyWebsite && (
                            <p className="text-gray-600">
                              {formData.companyWebsite}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        <QRCodePlaceholder />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-500 bg-accent/5 rounded-lg">
                  Select a template to preview
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
