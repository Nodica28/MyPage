import React, {useMemo} from "react";
import {useAuth} from "@/hooks/use-auth";
import {useToast} from "@/hooks/use-toast";
import {PageContainer, PageContent} from "@/components/layout/page-container";
import {Separator} from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Label} from "@/components/ui/label";
import {
  Copy,
  Facebook,
  Linkedin,
  Twitter,
  Instagram,
  Share2,
  SendHorizontal
} from "lucide-react";
import {SentryTest} from "@/components/sentry-test";

function openCenteredPopup(url: string, title = "Share", w = 720, h = 600) {
  const y = window.top?.outerHeight
    ? Math.max(0, (window.top.outerHeight - h) / 2)
    : 0;
  const x = window.top?.outerWidth
    ? Math.max(0, (window.top.outerWidth - w) / 2)
    : 0;
  const features = `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, copyhistory=no, width=${w}, height=${h}, top=${y}, left=${x}`;
  window.open(url, title, features);
}

export default function IntegrationsSettings(): React.ReactNode {
  const {user} = useAuth();
  const {toast} = useToast();

  const profileUrl = useMemo(() => {
    if (!user?.publicPath) return "";
    const baseUrl = "https://app.withbadge.ai";
    return `${baseUrl}/${user.publicPath}`;
  }, [user?.publicPath]);

  const shareText = useMemo(() => {
    const fullName = [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join(" ");
    return `${fullName ? `${fullName} – ` : ""}My Badge profile`;
  }, [user?.firstName, user?.lastName]);

  const embedCode = useMemo(() => {
    if (!profileUrl) return "";
    const src = profileUrl.replace(
      "https://app.withbadge.ai/",
      "https://app.withbadge.ai/embed/"
    );
    return `<iframe
  src="${src}"
  title="Badge Profile"
  style="border:0;width:100%;max-width:420px;height:360px;border-radius:16px;overflow:hidden;"
  loading="lazy"
  referrerpolicy="no-referrer-when-downgrade"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
></iframe>`;
  }, [profileUrl]);

  const handleCopy = async (value: string, description: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({title: "Copied", description});
    } catch (error) {
      console.error(error);
      toast({
        title: "Copy failed",
        description: "Select and copy manually",
        variant: "destructive"
      });
    }
  };

  const handleWebShare = () => {
    if (!profileUrl) return;
    if (navigator.share) {
      navigator
        .share({title: shareText, url: profileUrl})
        .catch(() => handleCopy(profileUrl, "Profile link copied"));
    } else {
      handleCopy(profileUrl, "Profile link copied");
    }
  };

  const handleShare = (platform: string) => {
    if (!profileUrl) return;
    const encodedUrl = encodeURIComponent(profileUrl);
    const encodedText = encodeURIComponent(`${shareText} ${profileUrl}`);

    switch (platform) {
      case "facebook":
        openCenteredPopup(
          `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        );
        break;
      case "linkedin":
        openCenteredPopup(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
        );
        break;
      case "twitter":
        openCenteredPopup(
          `https://twitter.com/intent/tweet?text=${encodedText}`
        );
        break;
      case "whatsapp":
        openCenteredPopup(`https://wa.me/?text=${encodedText}`);
        break;
      case "telegram":
        openCenteredPopup(
          `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(shareText)}`
        );
        break;
      case "instagram":
        toast({
          title: "Instagram",
          description:
            "Instagram doesn't support desktop link share. Copy your link and paste in your bio or story."
        });
        break;
      default:
        handleWebShare();
    }
  };

  return (
    <PageContainer className="md:p-0 md:max-w-full">
      <div className="p-4 sm:p-6 md:p-8">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight md:text-2xl lg:text-3xl">
          Integrations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Share or embed your Badge profile across other platforms.
        </p>
      </div>
      <Separator />

      <PageContent className="py-4 sm:py-6 md:py-10 px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile link</CardTitle>
              <CardDescription>Copy and use this anywhere</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  readOnly
                  value={profileUrl}
                  placeholder="Your public profile URL"
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleCopy(profileUrl, "Profile link copied")}
                    disabled={!profileUrl}
                    className="flex-1 sm:flex-initial"
                  >
                    <Copy className="h-4 w-4 sm:mr-2" />
                    <span>Copy</span>
                  </Button>
                  <Button 
                    onClick={handleWebShare} 
                    disabled={!profileUrl}
                    className="flex-1 sm:flex-initial"
                  >
                    <Share2 className="h-4 w-4 mr-2" /> 
                    <span>Share</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Embed on websites</CardTitle>
              <CardDescription>
                Paste this HTML where you want your contact card to appear
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="embed-code">Iframe embed</Label>
                <Textarea
                  id="embed-code"
                  readOnly
                  value={embedCode}
                  className="font-mono text-xs"
                  rows={8}
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleCopy(embedCode, "Embed code copied")}
                    disabled={!embedCode}
                    className="w-full sm:w-auto"
                  >
                    <Copy className="h-4 w-4 mr-2" /> 
                    <span className="hidden sm:inline">Copy embed code</span>
                    <span className="sm:hidden">Copy code</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Share to social platforms</CardTitle>
              <CardDescription>
                Post your profile as a link preview on popular platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleShare("facebook")}
                  disabled={!profileUrl}
                  className="w-full sm:w-auto"
                >
                  <Facebook className="h-4 w-4 mr-2" /> 
                  <span>Facebook</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShare("linkedin")}
                  disabled={!profileUrl}
                  className="w-full sm:w-auto"
                >
                  <Linkedin className="h-4 w-4 mr-2" /> 
                  <span>LinkedIn</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShare("twitter")}
                  disabled={!profileUrl}
                  className="w-full sm:w-auto"
                >
                  <Twitter className="h-4 w-4 mr-2" /> 
                  <span className="hidden sm:inline">X / Twitter</span>
                  <span className="sm:hidden">Twitter</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShare("whatsapp")}
                  disabled={!profileUrl}
                  className="w-full sm:w-auto"
                >
                  <SendHorizontal className="h-4 w-4 mr-2" /> 
                  <span>WhatsApp</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShare("telegram")}
                  disabled={!profileUrl}
                  className="w-full sm:w-auto"
                >
                  <SendHorizontal className="h-4 w-4 mr-2" /> 
                  <span>Telegram</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShare("instagram")}
                  disabled={!profileUrl}
                  className="w-full sm:w-auto"
                >
                  <Instagram className="h-4 w-4 mr-2" /> 
                  <span>Instagram</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Note: Instagram doesn't support desktop sharing. Copy your link
                and paste it in your bio or stories.
              </p>
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Monitoring & Debugging</CardTitle>
              <CardDescription>
                Test Sentry error monitoring and performance tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SentryTest />
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  );
}
