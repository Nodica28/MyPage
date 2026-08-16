"use client";

import * as React from "react";
import {useState, useEffect} from "react";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import EmailSignature from "../components/branding/EmailSignature"; // Import the EmailSignature component
import BannerManager from "../components/branding/BannerManager"; // Import the BannerManager component
import {Mail, Image} from "lucide-react";
import {ErrorBoundary} from "@/components/error-boundary";

export function BrandAssetsPage() {
  const [activeTab, setActiveTab] = useState("email-signature");

  // Check URL parameters to set active tab on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      
      // If tab parameter is "banner", switch to banner tab
      if (tabParam === "banner") {
        setActiveTab("banner");
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <div className="flex flex-col bg-white">
        <div className="flex flex-col border sm:rounded-2xl h-full flex-grow">
          <div className="py-3 px-4 flex flex-row items-center justify-between border-b">
            <div className="h-9 flex items-center">
              <h2 className="text-lg font-medium">Brand Assets</h2>
            </div>
          </div>

          <div className="flex flex-col p-7 border-y-0 flex-grow">
            <Tabs
              defaultValue="email-signature"
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="mb-4">
                <TabsTrigger
                  value="email-signature"
                  className="flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  <span>Email Signature</span>
                </TabsTrigger>
                <TabsTrigger value="banner" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  <span>Banner</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email-signature" className="sm:px-0 px-0">
                <div className="border-0 sm:border-0">
                  <EmailSignature />
                </div>
              </TabsContent>

              <TabsContent value="banner" className="sm:px-0 px-0">
                <div className="border-0 sm:border-0">
                  <BannerManager />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default BrandAssetsPage;
