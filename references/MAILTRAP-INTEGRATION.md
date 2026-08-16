# Mailtrap Integration Guide

This guide explains how to integrate Mailtrap into your Badge application to replace nodemailer.

## What Changed

The application has been updated to use Mailtrap instead of nodemailer for all email functionality:

1. **New Mailtrap Service**: `server/services/mailtrap-email.ts`
2. **Updated Email Service**: `server/services/email.ts` now delegates to Mailtrap
3. **Updated Lead Generation**: `server/routes/leadgen.ts` uses Mailtrap for lead notifications

## Environment Variables

Add these environment variables to your `.env` file:

```bash
# Required: Mailtrap API Token
MAILTRAP_TOKEN=your_mailtrap_api_token

# Email Configuration
EMAIL_FROM=hello@withbadge.ai
EMAIL_FROM_NAME=Badge AI

# Required: Mailtrap Template UUIDs
MAILTRAP_MAGIC_LINK_TEMPLATE=your_magic_link_template_uuid
MAILTRAP_LEAD_NOTIFICATION_TEMPLATE=your_lead_notification_template_uuid
MAILTRAP_LEAD_INQUIRY_RESPONSE_TEMPLATE=your_lead_inquiry_response_template_uuid
MAILTRAP_INVITATION_TEMPLATE=your_invitation_template_uuid

# App URL (used in email links)
APP_URL=https://app.withbadge.ai/
```

## Getting Started

### 1. Get Your Mailtrap API Token

1. Sign up for a [Mailtrap account](https://mailtrap.io)
2. Go to your dashboard
3. Navigate to API Tokens section
4. Create a new API token
5. Copy the token to your `.env` file as `MAILTRAP_TOKEN`

### 2. Template Configuration (Required)

Create templates in Mailtrap for all email types. The application requires these templates to function:

#### Magic Link Email Template

1. Create a new template in Mailtrap
2. Use these variables in your template:
   - `{{login_link}}` - The magic link URL
   - `{{user_email}}` - Recipient email address
   - `{{app_name}}` - Application name
   - `{{company_name}}` - Company name
3. Copy the template UUID to `MAILTRAP_MAGIC_LINK_TEMPLATE`

#### Lead Notification Template

1. Create a new template in Mailtrap
2. Use these variables in your template:
   - `{{user_email}}` - User's email
   - `{{app_url}}` - Application URL
   - `{{company_name}}` - Company name
   - `{{field_1_label}}`, `{{field_1_value}}` - First form field
   - `{{field_2_label}}`, `{{field_2_value}}` - Second form field
   - ... (up to the number of fields in your forms)
3. Copy the template UUID to `MAILTRAP_LEAD_NOTIFICATION_TEMPLATE`

#### Lead Inquiry Response Template

1. Create a new template in Mailtrap
2. Use these variables in your template:
   - `{{app_url}}` - Application URL
   - `{{company_name}}` - Company name
   - `{{support_email}}` - Support email address
   - `{{field_1_label}}`, `{{field_1_value}}` - First form field
   - `{{field_2_label}}`, `{{field_2_value}}` - Second form field
   - ... (up to `{{field_10_label}}`, `{{field_10_value}}`)
   - `{{additional_fields}}` - HTML for fields beyond the first 10
3. Copy the template UUID to `MAILTRAP_LEAD_INQUIRY_RESPONSE_TEMPLATE`

#### Invitation Email Template

1. Create a new template in Mailtrap
2. Use these variables in your template:
   - `{{invitation_url}}` - The invitation acceptance URL
   - `{{organization_name}}` - Name of the organization
   - `{{organization_logo}}` - URL of the organization's logo
   - `{{inviter_name}}` - Name of the person sending the invitation
   - `{{invitee_email}}` - Recipient's email address
   - `{{app_name}}` - Application name
   - `{{company_name}}` - Company name
3. Copy the template UUID to `MAILTRAP_INVITATION_TEMPLATE`

## API Usage

### Sending Custom Emails

```typescript
import {sendMail} from "../services/mailtrap-email";

await sendMail({
  to: "user@example.com",
  subject: "Welcome!",
  text: "Welcome to our service",
  html: "<h1>Welcome to our service</h1>"
});
```

### Sending Template Emails

```typescript
import {sendTemplateEmail} from "../services/mailtrap-email";

await sendTemplateEmail({
  to: "user@example.com",
  templateUuid: "your-template-uuid",
  templateVariables: {
    user_name: "John Doe",
    welcome_link: "https://example.com/welcome"
  }
});
```

### Sending Magic Link Emails

```typescript
import {sendMagicLinkEmail} from "../services/mailtrap-email";

await sendMagicLinkEmail({
  to: "user@example.com",
  token: "magic-link-token",
  appUrl: "https://yourdomain.com"
});
```

### Sending Invitation Emails

```typescript
import {sendInvitationEmail} from "../services/mailtrap-email";

await sendInvitationEmail({
  to: "newuser@example.com",
  invitationUrl: "https://yourdomain.com/register?token=abc123",
  organization: {
    name: "Acme Corp",
    logo: "https://example.com/logo.png"
  },
  inviter: {
    firstName: "John",
    lastName: "Doe"
  }
});
```

### Sending Lead Inquiry Response Emails

```typescript
import {sendLeadInquiryResponseEmail} from "../services/mailtrap-email";

await sendLeadInquiryResponseEmail(["user@example.com", "admin@example.com"], {
  name: {value: "John Doe", type: "text", label: "Name"},
  email: {value: "john@example.com", type: "email", label: "Email"},
  message: {value: "I'm interested!", type: "textarea", label: "Message"}
});
```

## Migration from Nodemailer

The migration maintains the same interface but now requires Mailtrap templates:

1. **Same Interface**: The email functions maintain the same interface
2. **Template Required**: All email types now require configured templates
3. **Error Handling**: Maintains the same error handling patterns
4. **Environment Variables**: Set all required template UUIDs

## Benefits of Mailtrap

1. **Better Deliverability**: Mailtrap handles email deliverability optimization
2. **Template Management**: Visual template editor and version control
3. **Analytics**: Built-in email analytics and tracking
4. **Testing**: Separate sandbox environment for development
5. **Reliability**: Professional email infrastructure
6. **Consistency**: All emails use professional templates

## Troubleshooting

### Email Not Sending

1. Check that `MAILTRAP_TOKEN` is set correctly
2. Verify all template UUIDs are configured
3. Verify your Mailtrap account has sufficient credits
4. Check the server logs for detailed error messages

### Template Issues

1. Verify all template UUIDs are correct and published
2. Ensure all required template variables are provided
3. Check that templates are published in Mailtrap
4. Verify templates match the expected variable names

### Development Issues

In development mode, email failures are logged but don't stop the application. Check the console for detailed error messages.

## Legacy Environment Variables

These are no longer needed and can be removed:

```bash
# No longer needed
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
EMAIL_SERVER
```

## Support

For Mailtrap-specific issues, refer to the [Mailtrap documentation](https://help.mailtrap.io/) or contact their support team.
