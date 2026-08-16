"use client";

import {useState, useEffect, useRef} from "react";
import {Button} from "@/components/ui/button";
import {Card} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {ScrollArea} from "@/components/ui/scroll-area";
import {X, Send, MessageSquare} from "lucide-react";
import {GlobalChatSettings, ChatPrompt} from "@shared/types/chat";
import {apiRequest} from "@/lib/queryClient";
import {useToast} from "@/hooks/use-toast";
import {cn} from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  content: string;
  fromUser: boolean;
  timestamp: Date;
}

interface ChatModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  action?: {
    id: string;
    label: string;
    settings?: Record<string, any>;
  };
  chatSettings?: GlobalChatSettings;
  userPath?: string;
  fullScreen?: boolean;
}

export function ChatModal({
  isOpen,
  onOpenChange,
  action,
  chatSettings: propChatSettings,
  userPath,
  fullScreen = false
}: ChatModalProps) {
  const {toast} = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use either provided chat settings or get from action
  const chatSettings =
    propChatSettings ||
    (action?.settings?.chat
      ? ({
          enabled: true,
          welcomeMessage: "Hi there! How can I help you today?",
          position: "bottom-right",
          chatSettings: action.settings.chat
        } as GlobalChatSettings)
      : undefined);

  // Get position classes for the modal based on settings
  const getPositionClasses = () => {
    if (!chatSettings?.position) return "bottom-5 right-5";

    switch (chatSettings.position) {
      case "bottom-right":
        return "bottom-[1.65rem] right-[6.25rem]";
      case "bottom-left":
        return "bottom-[1.65rem] left-5";
      case "top-right":
        return "top-5 right-5";
      case "top-left":
        return "top-5 left-5";
      default:
        return "bottom-5 right-5";
    }
  };

  // Add welcome message when chat is first opened
  useEffect(() => {
    if (isOpen && messages.length === 0 && chatSettings?.welcomeMessage) {
      setMessages([
        {
          id: "welcome",
          content: chatSettings.welcomeMessage,
          fromUser: false,
          timestamp: new Date()
        }
      ]);
    }
  }, [isOpen, chatSettings?.welcomeMessage, messages.length]);

  // Scroll to bottom of messages when new message is added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({behavior: "smooth"});
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    if (!userPath) {
      toast({
        title: "Error",
        description: "Cannot send message: user profile path is missing.",
        variant: "destructive"
      });
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputMessage,
      fromUser: true,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Format existing messages for the API
      const messageHistory = messages.map((msg) => ({
        fromUser: msg.fromUser,
        content: msg.content
      }));

      // Call the chat API with the message
      const response = await apiRequest("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          userPath,
          message: inputMessage,
          messages: messageHistory,
          chatSettings
        })
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: response.content,
        fromUser: false,
        timestamp: new Date(response.timestamp || Date.now())
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    } catch (error) {
      console.error("Error sending message:", error);
      setIsLoading(false);

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content:
            "Sorry, there was an error processing your message. Please try again.",
          fromUser: false,
          timestamp: new Date()
        }
      ]);

      toast({
        title: "Error",
        description: "Failed to get response from the AI. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handlePromptClick = async (prompt: ChatPrompt) => {
    if (!userPath) {
      toast({
        title: "Error",
        description: "Cannot send message: user profile path is missing.",
        variant: "destructive"
      });
      return;
    }

    const promptMessage: Message = {
      id: `user-${Date.now()}`,
      content: prompt.text,
      fromUser: true,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, promptMessage]);
    setIsLoading(true);

    try {
      // Format existing messages for the API
      const messageHistory = messages.map((msg) => ({
        fromUser: msg.fromUser,
        content: msg.content
      }));

      // Call the chat API with the prompt
      const response = await apiRequest("/api/chat", {
        method: "POST",
        body: JSON.stringify({
          userPath,
          message: prompt.text,
          messages: messageHistory,
          chatSettings
        })
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: response.content,
        fromUser: false,
        timestamp: new Date(response.timestamp || Date.now())
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    } catch (error) {
      console.error("Error sending prompt:", error);
      setIsLoading(false);

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content:
            "Sorry, there was an error processing your message. Please try again.",
          fromUser: false,
          timestamp: new Date()
        }
      ]);

      toast({
        title: "Error",
        description: "Failed to get response from the AI. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
  };

  // If no chat settings are available, don't render
  if (!chatSettings || !chatSettings?.enabled) {
    return null;
  }

  return (
    <Card
      className={cn(
        fullScreen
          ? "fixed inset-0 z-50 flex flex-col shadow-lg overflow-hidden"
          : "fixed z-50 flex flex-col shadow-lg rounded-lg overflow-hidden w-[350px] sm:w-[400px] h-[530px]",
        !fullScreen && getPositionClasses()
      )}
    >
      {/* Chat header */}
      <div className="p-3 bg-primary text-primary-foreground flex justify-between items-center">
        <div className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          <span className="font-medium">
            {action?.label || "Chat Assistant"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="h-8 w-8 rounded-full hover:bg-primary-foreground/20 text-primary-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Chat messages */}
      <ScrollArea className="flex-1 p-3 bg-white">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.fromUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  msg.fromUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <div
                  className={`text-sm ${
                    !msg.fromUser &&
                    "prose prose-sm max-w-none dark:prose-invert prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-pre:bg-gray-800/5 prose-pre:p-2 prose-pre:rounded prose-code:text-primary prose-code:bg-gray-800/5 prose-code:p-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none"
                  }`}
                >
                  {msg.fromUser ? (
                    msg.content
                  ) : (
                    <ReactMarkdown
                      rehypePlugins={[rehypeRaw, rehypeSanitize]}
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({...props}) => (
                          <a
                            {...props}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline"
                          />
                        ),
                        pre: ({...props}) => (
                          <pre
                            {...props}
                            className="bg-gray-800/5 p-2 rounded-md overflow-auto my-2"
                          />
                        ),
                        code: ({children, className, ...props}: any) => {
                          const isInline = !className;
                          return isInline ? (
                            <code
                              {...props}
                              className="bg-gray-800/5 px-1 rounded text-primary"
                            >
                              {children}
                            </code>
                          ) : (
                            <code {...props} className={className}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
                </div>
                <div
                  className={`text-xs mt-1 ${msg.fromUser ? "text-primary-foreground/70" : "text-gray-500"}`}
                >
                  {formatTimestamp(msg.timestamp)}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-3 rounded-lg bg-gray-100 text-gray-800">
                <div className="text-sm flex items-center">
                  <span className="mr-2">Thinking</span>
                  <span className="animate-pulse">...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Default prompts */}
      {chatSettings.chatSettings?.defaultPrompts?.length > 0 &&
        messages.length === 1 && (
          <div className="px-3 py-2 bg-gray-50 border-t">
            <p className="text-xs text-gray-500 mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {chatSettings.chatSettings.defaultPrompts.map((prompt) => (
                <Button
                  key={prompt.id}
                  variant="outline"
                  size="sm"
                  className="text-xs py-1 h-auto"
                  onClick={() => handlePromptClick(prompt)}
                >
                  {prompt.text}
                </Button>
              ))}
            </div>
          </div>
        )}

      {/* Chat input */}
      <div className="p-3 bg-white border-t">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!inputMessage.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
