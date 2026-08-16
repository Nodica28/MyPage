import React, {useState} from "react";
import {
  ConnectedApp,
  defaultConnectedApps
} from "../../types/connected-apps-settings";
import {Switch} from "../ui/switch";
import {PageContainer, PageContent} from "@/components/layout/page-container";
import {Separator} from "@/components/ui/separator";

const ConnectedApps: React.FC = () => {
  const [connectedApps, setConnectedApps] =
    useState<ConnectedApp[]>(defaultConnectedApps);

  const toggleAppConnection = (appId: string) => {
    setConnectedApps((prevApps) =>
      prevApps.map((app) =>
        app.id === appId ? {...app, isEnabled: !app.isEnabled} : app
      )
    );
  };

  return (
    <PageContainer className="md:p-0 md:max-w-full">
      <div className="p-8 hidden sm:block">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight md:text-2xl lg:text-3xl">
          Connected apps
        </h1>
      </div>
      <Separator className="hidden sm:block" />

      <PageContent className="py-10 px-8">
        <div className="flex flex-col justify-between md:flex-row gap-4">
          <div>
            <h2 className="text-2xl font-bold">Connected apps</h2>
            <p className="text-gray-600">
              Supercharge your workflow and connect the tool you use every day.
            </p>
          </div>
          <div className="flex justify-between mb-6">
            <div className="relative w-full max-w-md">
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-3 left-0 pl-3 flex pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {connectedApps.map((app) => (
            <div
              key={app.id}
              className="border-b pb-6 flex items-center justify-between"
            >
              <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center w-full">
                <div className="w-12 h-12 flex-shrink-0">
                  <img
                    src={app.icon}
                    alt={`${app.name} icon`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-medium">{app.name}</h3>
                  <p className="text-gray-600">{app.description}</p>
                </div>
                <div className="flex items-center gap-6">
                  <a href="#" className="text-blue-600">
                    Learn more
                  </a>
                  <Switch
                    checked={app.isEnabled}
                    onCheckedChange={() => toggleAppConnection(app.id)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </PageContent>
    </PageContainer>
  );
};

export default ConnectedApps;
