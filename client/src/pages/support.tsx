import React, {useState} from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import {
  Mail,
  Search,
  FileText,
  Video,
  MessageSquare,
  HelpCircle
} from "lucide-react";
import {useToast} from "@/hooks/use-toast";
import {faqItems} from "@/data/support-faq";

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    category: "general"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {toast} = useToast();

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/support/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(contactForm)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send message");
      }

      toast({
        title: "Message Sent Successfully!",
        description: result.message || "We'll get back to you within 24 hours."
      });

      // Reset form
      setContactForm({
        name: "",
        email: "",
        subject: "",
        message: "",
        category: "general"
      });
    } catch (error) {
      console.error("Error sending support message:", error);
      toast({
        title: "Error Sending Message",
        description:
          error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFAQs = faqItems.filter(
    (category) =>
      searchQuery === "" ||
      category.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.questions.some(
        (q) =>
          q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  return (
    <div className="w-full max-w-full min-h-[calc(100vh-48px)] flex flex-col bg-white">
      <div className="py-3 px-4 flex flex-row items-center justify-between border sm:rounded-t-2xl">
        <div>
          <h2 className="text-lg font-medium">Support & Help</h2>
        </div>
      </div>
      <div className="py-8 px-6 rounded-md border rounded-t-none sm:rounded-b-2xl h-full flex-1">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Search Bar */}
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold">How can we help you?</h1>
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 text-base"
              />
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* FAQ Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  Frequently Asked Questions
                </CardTitle>
                <CardDescription>
                  Find quick answers to common questions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {filteredFAQs.slice(0, 3).map((category, categoryIndex) => (
                    <AccordionItem
                      key={categoryIndex}
                      value={`category-${categoryIndex}`}
                    >
                      <AccordionTrigger className="text-left text-sm">
                        <div className="flex items-center gap-2">
                          <category.icon className="h-4 w-4" />
                          <span>{category.category}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pt-2">
                          {category.questions
                            .slice(0, 2)
                            .map((faq, faqIndex) => (
                              <div
                                key={faqIndex}
                                className="pb-3 border-b last:border-b-0"
                              >
                                <h4 className="font-medium text-sm mb-2">
                                  {faq.question}
                                </h4>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {faq.answer}
                                </p>
                              </div>
                            ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Contact Support */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Contact Support
                </CardTitle>
                <CardDescription>
                  Need help? Send us a message and we'll get back to you soon.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Input
                        placeholder="Your name"
                        value={contactForm.name}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            name: e.target.value
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Input
                        type="email"
                        placeholder="Your email"
                        value={contactForm.email}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            email: e.target.value
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Subject"
                        value={contactForm.subject}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            subject: e.target.value
                          })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Textarea
                        placeholder="How can we help you?"
                        value={contactForm.message}
                        onChange={(e) =>
                          setContactForm({
                            ...contactForm,
                            message: e.target.value
                          })
                        }
                        rows={4}
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Resources */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto p-4 justify-start">
                  <FileText className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Documentation</div>
                    <div className="text-xs text-muted-foreground">
                      Complete guides and tutorials
                    </div>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto p-4 justify-start">
                  <Video className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Video Tutorials</div>
                    <div className="text-xs text-muted-foreground">
                      Step-by-step walkthroughs
                    </div>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto p-4 justify-start">
                  <Mail className="h-5 w-5 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Email Support</div>
                    <div className="text-xs text-muted-foreground">
                      support@badge.com
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
