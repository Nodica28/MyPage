import express, {Request, Response} from "express";
import {z} from "zod";
import {sendMail} from "../services/email";

const router = express.Router();

// Validation schema for contact form
const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  category: z.string().optional().default("general")
});

/**
 * POST /api/support/contact
 * Handles contact form submissions and sends support emails
 */
router.post("/contact", async (req: Request, res: Response) => {
  try {
    console.log("[Support] Received contact form submission:", req.body);

    // Validate the request body
    const validationResult = contactFormSchema.safeParse(req.body);

    if (!validationResult.success) {
      console.error("[Support] Validation error:", validationResult.error);
      return res.status(400).json({
        error: "Invalid form data",
        details: validationResult.error.errors
      });
    }

    const {name, email, subject, message, category} = validationResult.data;

    // Email content for support team
    const supportEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin: 0;">New Support Request</h2>
        </div>
        
        <div style="background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h3 style="color: #374151; margin-top: 0;">Contact Information</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Category:</strong> ${category}</p>
          
          <h3 style="color: #374151; margin-top: 30px;">Subject</h3>
          <p style="font-weight: 500;">${subject}</p>
          
          <h3 style="color: #374151; margin-top: 30px;">Message</h3>
          <div style="background: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            This message was sent through the Badge Support Center at ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `;

    const supportEmailText = `
New Support Request

Contact Information:
Name: ${name}
Email: ${email}
Category: ${category}

Subject: ${subject}

Message:
${message}

---
Sent through Badge Support Center at ${new Date().toLocaleString()}
    `;

    // Send email to support team
    const supportEmail = process.env.SUPPORT_EMAIL || "justine@withbadge.ai";

    await sendMail({
      to: supportEmail,
      subject: `Support Request: ${subject}`,
      text: supportEmailText,
      html: supportEmailHtml
    });

    // Send confirmation email to user
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #3b82f6; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h2 style="color: white; margin: 0;">Thank You for Contacting Badge Support</h2>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; color: #374151; margin-top: 0;">Hi ${name},</p>
          
          <p style="color: #374151; line-height: 1.6;">
            We've received your support request and our team will get back to you within 24 hours.
          </p>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h4 style="color: #047857; margin-top: 0;">Your Request Summary:</h4>
            <p style="margin: 5px 0;"><strong>Subject:</strong> ${subject}</p>
            <p style="margin: 5px 0;"><strong>Category:</strong> ${category}</p>
            <p style="margin: 5px 0;"><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p style="color: #374151; line-height: 1.6;">
            In the meantime, you can check our <a href="${process.env.APP_URL || "https://app.withbadge.ai"}/support" style="color: #3b82f6;">FAQ section</a> for immediate answers to common questions.
          </p>
          
          <p style="color: #374151; line-height: 1.6;">
            Best regards,<br>
            <strong>Badge Support Team</strong>
          </p>
        </div>
      </div>
    `;

    const confirmationText = `
Hi ${name},

We've received your support request and our team will get back to you within 24 hours.

Your Request Summary:
Subject: ${subject}
Category: ${category}
Submitted: ${new Date().toLocaleString()}

In the meantime, you can check our FAQ section for immediate answers to common questions.

Best regards,
Badge Support Team
    `;

    await sendMail({
      to: email,
      subject: "We've received your support request",
      text: confirmationText,
      html: confirmationHtml
    });

    console.log(
      `[Support] Successfully sent support emails for request from ${email}`
    );

    res.json({
      success: true,
      message:
        "Your support request has been sent successfully. We'll get back to you within 24 hours."
    });
  } catch (error) {
    console.error("[Support] Error processing contact form:", error);
    res.status(500).json({
      error: "Failed to send support request",
      details: error instanceof Error ? error.message : "Unknown error occurred"
    });
  }
});

export default router;
