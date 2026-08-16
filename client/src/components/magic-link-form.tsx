import {useState} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {z} from "zod";
import {useMutation} from "@tanstack/react-query";
import {Mail, Loader2, ArrowRight} from "lucide-react";
import {Button} from "@/components/ui/button";
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

const magicLinkSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .transform((email) => email.toLowerCase())
});

type MagicLinkFormData = z.infer<typeof magicLinkSchema>;

export function MagicLinkForm() {
  const {toast} = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<MagicLinkFormData>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: {
      email: ""
    }
  });

  const requestMagicLink = async (email: string) => {
    const response = await fetch("/api/auth/magic-link/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({email})
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to send magic link");
    }

    return response.json();
  };

  const magicLinkMutation = useMutation({
    mutationFn: (data: MagicLinkFormData) => requestMagicLink(data.email),
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Magic link sent",
        description: "Check your email for a link to sign in"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: MagicLinkFormData) => {
    magicLinkMutation.mutate(data);
  };

  if (isSubmitted) {
    return (
      <div className="text-center p-6 space-y-4">
        <div className="mx-auto rounded-full bg-primary/10 p-3 w-12 h-12 flex items-center justify-center">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-xl font-medium">Check your email</h3>
        <p className="text-muted-foreground">
          We've sent a magic link to <strong>{form.getValues().email}</strong>
        </p>
        <p className="text-sm text-muted-foreground mt-6">
          The link will expire in 30 minutes. If you don't see the email, check
          your spam folder.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => setIsSubmitted(false)}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({field}) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <div className="flex relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    placeholder="name@example.com"
                    className="pl-9 w-full"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={magicLinkMutation.isPending}
        >
          {magicLinkMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <>
              Send magic link
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
