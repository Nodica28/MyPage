"use client";

import * as React from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {Plus, X, Mail, Loader2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {useToast} from "@/hooks/use-toast";
import {useSendInvitations} from "@/hooks/use-invitations";
import {useCurrentOrganization} from "@/hooks/use-organizations";

const inviteTeamSchema = z.object({
  emails: z.array(z.string().email("Please enter a valid email address"))
});

type InviteTeamFormData = z.infer<typeof inviteTeamSchema>;

interface InviteTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteTeamModal({open, onOpenChange}: InviteTeamModalProps) {
  const {toast} = useToast();
  const {data: organization, isLoading: isOrgLoading} =
    useCurrentOrganization();
  const sendInvitationsMutation = useSendInvitations();

  const form = useForm<InviteTeamFormData>({
    resolver: zodResolver(inviteTeamSchema),
    defaultValues: {
      emails: [""]
    }
  });

  const watchedEmails = form.watch("emails");

  const handleAddEmail = () => {
    const currentEmails = form.getValues("emails");
    form.setValue("emails", [...currentEmails, ""]);
  };

  const handleRemoveEmail = (index: number) => {
    const currentEmails = form.getValues("emails");
    if (currentEmails.length > 1) {
      const newEmails = currentEmails.filter((_, i) => i !== index);
      form.setValue("emails", newEmails);
    }
  };

  const onSubmit = async (data: InviteTeamFormData) => {
    if (!organization?.id) {
      toast({
        title: "Error",
        description: "No organization found. Please refresh and try again.",
        variant: "destructive"
      });
      return;
    }

    // Filter out empty emails
    const validEmails = data.emails.filter(
      (email) => email && email.trim() !== ""
    );

    if (validEmails.length === 0) {
      toast({
        title: "No emails to send",
        description: "Please enter at least one email address.",
        variant: "destructive"
      });
      return;
    }

    sendInvitationsMutation.mutate(
      {
        emails: validEmails,
        organizationId: organization.id,
        role: "User"
      },
      {
        onSuccess: (response) => {
          const successCount =
            response.results?.filter((r) => r.success).length || 0;

          if (successCount > 0) {
            toast({
              title: "Invitations sent",
              description: `Successfully sent ${successCount} invitation${
                successCount !== 1 ? "s" : ""
              }`
            });

            // Reset form and close modal
            form.reset({emails: [""]});
            onOpenChange(false);
          } else {
            toast({
              title: "Failed to send invitations",
              description: "Please check the email addresses and try again.",
              variant: "destructive"
            });
          }
        },
        onError: (error) => {
          toast({
            title: "Error sending invitations",
            description:
              error instanceof Error
                ? error.message
                : "An unexpected error occurred",
            variant: "destructive"
          });
        }
      }
    );
  };

  // Reset form when modal closes
  React.useEffect(() => {
    if (!open) {
      form.reset({emails: [""]});
    }
  }, [open, form]);

  if (isOrgLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Members</DialogTitle>
          <DialogDescription>
            Send invitations to team members to join{" "}
            {organization?.name || "your organization"}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-3">
              {watchedEmails.map((_, index) => (
                <FormField
                  key={index}
                  control={form.control}
                  name={`emails.${index}`}
                  render={({field}) => (
                    <FormItem>
                      {index === 0 && <FormLabel>Email addresses</FormLabel>}
                      <FormControl>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              {...field}
                              placeholder="colleague@company.com"
                              className="pl-10"
                            />
                          </div>
                          {watchedEmails.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveEmail(index)}
                              className="px-2"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleAddEmail}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add another email
            </Button>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sendInvitationsMutation.isPending}
                className="flex-1"
              >
                {sendInvitationsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Invitations"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
