import React, {useState} from "react";
import {Switch} from "@/components/ui/switch";
import {PageContainer, PageContent} from "@/components/layout/page-container";
import {Separator} from "@/components/ui/separator";

interface NotificationCategory {
  id: string;
  title: string;
  description: string;
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
}

const NotificationsSettings: React.FC = () => {
  const [notificationSettings, setNotificationSettings] = useState<
    NotificationCategory[]
  >([
    {
      id: "comments",
      title: "Comments",
      description:
        "These are notifications for comments on your posts and replies to your comments.",
      channels: {
        push: true,
        email: true,
        sms: false
      }
    },
    {
      id: "tags",
      title: "Tags",
      description:
        "These are notifications for when someone tags you in a comment, post or story.",
      channels: {
        push: true,
        email: false,
        sms: false
      }
    },
    {
      id: "reminders",
      title: "Reminders",
      description:
        "These are notifications to remind you of updates you might have missed.",
      channels: {
        push: false,
        email: false,
        sms: false
      }
    },
    {
      id: "activity",
      title: "More activity about you",
      description:
        "These are notifications for posts on your profile, likes and other reactions to your posts, and more.",
      channels: {
        push: false,
        email: false,
        sms: false
      }
    }
  ]);

  const toggleNotification = (
    categoryId: string,
    channel: keyof NotificationCategory["channels"]
  ) => {
    setNotificationSettings((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              channels: {
                ...category.channels,
                [channel]: !category.channels[channel]
              }
            }
          : category
      )
    );
  };

  return (
    <PageContainer className="md:p-0 md:max-w-full">
      <div className="p-8 hidden sm:block">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight md:text-2xl lg:text-3xl">
          Notifications
        </h1>
      </div>
      <Separator className="hidden sm:block" />

      <PageContent className="py-10 px-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div>
            <h2 className="text-2xl font-bold">Notification settings</h2>
            <p className="text-gray-600">
              We may still send you important notifications about your account
              outside of your notification settings.
            </p>
          </div>
        </div>

        <div className="space-y-6 mt-6">
          {notificationSettings.map((category) => (
            <div key={category.id} className="border-b pb-6">
              <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
                <div>
                  <h3 className="font-medium">{category.title}</h3>
                  <p className="text-gray-600">{category.description}</p>
                </div>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between space-x-8">
                    <Switch
                      checked={category.channels.push}
                      onCheckedChange={() =>
                        toggleNotification(category.id, "push")
                      }
                    />
                    <span className="text-gray-700 w-16">Push</span>
                  </div>
                  <div className="flex items-center justify-between space-x-8">
                    <Switch
                      checked={category.channels.email}
                      onCheckedChange={() =>
                        toggleNotification(category.id, "email")
                      }
                    />
                    <span className="text-gray-700 w-16">Email</span>
                  </div>
                  <div className="flex items-center justify-between space-x-8">
                    <Switch
                      checked={category.channels.sms}
                      onCheckedChange={() =>
                        toggleNotification(category.id, "sms")
                      }
                    />
                    <span className="text-gray-700 w-16">SMS</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PageContent>
    </PageContainer>
  );
};

export default NotificationsSettings;
