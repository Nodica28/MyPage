import * as dotenv from "dotenv";
dotenv.config();

import Jimp from "jimp";
import {v4 as uuidv4} from "uuid";
import {and, eq, like} from "drizzle-orm";
import {db, pool} from "../server/db";
import {
  users,
  leads,
  imageStorage,
  headshotRequests,
  type InsertLead
} from "@shared/schema";

// Seeds demo leads + demo headshot images for one existing user so the Leads
// table and AI Headshots gallery have something to show. Idempotent: rows are
// tagged with SAMPLE_MARKER, and a second run skips what already exists.
// Re-run with `--reset` to delete the previously seeded sample rows first.
//   pnpm tsx scripts/seed-sample-data.ts [--reset]
// Override the target account with SAMPLE_EMAIL.
const SAMPLE_EMAIL = (
  process.env.SAMPLE_EMAIL || "justine.anicdao@samplecompany.com"
).toLowerCase();
const SAMPLE_MARKER = "sample-seed";
const RESET = process.argv.includes("--reset");

const HOUR = 60 * 60 * 1000;

type SampleLead = {
  name: string;
  email: string;
  phone: string;
  /** How long ago the lead came in, in hours. */
  agoHours: number;
  fromQr: boolean;
  tags: string[];
  note?: string;
};

const SAMPLE_LEADS: SampleLead[] = [
  {
    name: "Marcus Ellery",
    email: "marcus.ellery@northwindlogistics.com",
    phone: "+1 415 555 0134",
    agoHours: 3,
    fromQr: true,
    tags: ["Hot lead", "Conference"],
    note: "Met at the SaaStr booth. Wants a demo for a 40-person ops team."
  },
  {
    name: "Priya Raghavan",
    email: "p.raghavan@lumenhealth.io",
    phone: "+1 206 555 0177",
    agoHours: 9,
    fromQr: true,
    tags: ["Conference"],
    note: "Asked about HIPAA and SSO. Send the security one-pager."
  },
  {
    name: "Tomas Berger",
    email: "tomas.berger@bergercapital.de",
    phone: "+49 30 555 0198",
    agoHours: 26,
    fromQr: false,
    tags: ["Investor"],
    note: "Intro came through the shared profile link, not the QR code."
  },
  {
    name: "Alicia Moreno",
    email: "alicia@morenodesign.studio",
    phone: "+34 91 555 0142",
    agoHours: 31,
    fromQr: false,
    tags: ["Partner"]
  },
  {
    name: "Kenji Watanabe",
    email: "k.watanabe@harborrobotics.jp",
    phone: "+81 3 5555 0121",
    agoHours: 50,
    fromQr: true,
    tags: ["Hot lead"],
    note: "Budget approved for Q4. Follow up Monday."
  },
  {
    name: "Danielle Okafor",
    email: "d.okafor@brightpathedu.org",
    phone: "+1 312 555 0163",
    agoHours: 74,
    fromQr: false,
    tags: ["Nurture"],
    note: "Non-profit pricing question — check the education discount."
  },
  {
    name: "Rafael Lima",
    email: "rafael.lima@vertexagro.com.br",
    phone: "+55 11 5555 0109",
    agoHours: 96,
    fromQr: true,
    tags: ["Conference", "Nurture"]
  },
  {
    name: "Sofia Lindqvist",
    email: "sofia.l@nordvalve.se",
    phone: "+46 8 555 0155",
    agoHours: 120,
    fromQr: false,
    tags: ["Partner"],
    note: "Wants to co-host a webinar in November."
  },
  {
    name: "Andrew Cole",
    email: "acole@stonebridgelegal.com",
    phone: "+1 617 555 0188",
    agoHours: 168,
    fromQr: false,
    tags: ["Nurture"]
  },
  {
    name: "Hannah Weiss",
    email: "hannah.weiss@atlasfoods.com",
    phone: "+1 503 555 0119",
    agoHours: 200,
    fromQr: true,
    tags: ["Hot lead", "Conference"],
    note: "Second touch. Sent the pricing deck already."
  },
  {
    name: "Omar Haddad",
    email: "omar.haddad@cedarworksme.com",
    phone: "+971 4 555 0173",
    agoHours: 260,
    fromQr: false,
    tags: ["Investor"]
  },
  {
    name: "Grace Tan",
    email: "grace.tan@meridianretail.sg",
    phone: "+65 6555 0146",
    agoHours: 320,
    fromQr: true,
    tags: ["Nurture"],
    note: "Cold-ish. Revisit after the holiday freeze."
  }
];

const TAG_COLORS: Record<string, string> = {
  "Hot lead": "#ef4444",
  Conference: "#3b82f6",
  Investor: "#8b5cf6",
  Partner: "#10b981",
  Nurture: "#f59e0b"
};

type SampleHeadshot = {
  settingCategory: "office" | "outdoors" | "fun" | "studio";
  setting: string;
  lighting: string;
  expression: string;
  clothing: string;
  /** Background gradient, top colour -> bottom colour. */
  gradient: [string, string];
  agoHours: number;
};

const SAMPLE_HEADSHOTS: SampleHeadshot[] = [
  {
    settingCategory: "studio",
    setting: "Seamless grey backdrop",
    lighting: "Softbox key light",
    expression: "confident",
    clothing: "Charcoal blazer over a white shirt",
    gradient: ["#3f4756", "#1b1f29"],
    agoHours: 2
  },
  {
    settingCategory: "office",
    setting: "Modern glass-walled office",
    lighting: "Natural window light",
    expression: "slight smile",
    clothing: "Navy suit, no tie",
    gradient: ["#2f4f7a", "#16233a"],
    agoHours: 5
  },
  {
    settingCategory: "office",
    setting: "Bookshelf-lined corner office",
    lighting: "Warm ambient light",
    expression: "professional",
    clothing: "Camel knit sweater",
    gradient: ["#6b4a2f", "#2c1d13"],
    agoHours: 27
  },
  {
    settingCategory: "outdoors",
    setting: "City rooftop at golden hour",
    lighting: "Golden hour backlight",
    expression: "broad smile",
    clothing: "Light blue oxford shirt",
    gradient: ["#c97b3c", "#3d2415"],
    agoHours: 52
  },
  {
    settingCategory: "outdoors",
    setting: "Leafy park path",
    lighting: "Overcast diffused light",
    expression: "neutral",
    clothing: "Olive field jacket",
    gradient: ["#3f6b45", "#17281a"],
    agoHours: 99
  },
  {
    settingCategory: "fun",
    setting: "Colour-blocked creative studio",
    lighting: "Coloured gel lighting",
    expression: "laughing",
    clothing: "Bright coral tee",
    gradient: ["#8e3d8f", "#2a1236"],
    agoHours: 150
  }
];

const hexToRgb = (hex: string) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16)
});

/**
 * Renders a stylised placeholder portrait: vertical gradient background, a
 * head-and-shoulders silhouette, the subject's initials, and a caption naming
 * the setting. These are drawn locally (no image API is called), so they are
 * obviously sample assets rather than fake photos of a real person.
 */
async function renderPlaceholderHeadshot(
  initials: string,
  caption: string,
  gradient: [string, string]
): Promise<Buffer> {
  const size = 768;
  const top = hexToRgb(gradient[0]);
  const bottom = hexToRgb(gradient[1]);
  const image = new Jimp(size, size, 0x000000ff);

  const headCx = size / 2;
  const headCy = size * 0.4;
  const headR = size * 0.155;
  const shoulderCx = size / 2;
  const shoulderCy = size * 0.95;
  const shoulderRx = size * 0.33;
  const shoulderRy = size * 0.27;

  image.scan(0, 0, size, size, function (x, y, idx) {
    const t = y / (size - 1);
    let r = Math.round(top.r + (bottom.r - top.r) * t);
    let g = Math.round(top.g + (bottom.g - top.g) * t);
    let b = Math.round(top.b + (bottom.b - top.b) * t);

    // Vignette: darken towards the corners.
    const dx = (x - size / 2) / (size / 2);
    const dy = (y - size / 2) / (size / 2);
    const vignette = 1 - 0.35 * Math.min(1, dx * dx + dy * dy);
    r = Math.round(r * vignette);
    g = Math.round(g * vignette);
    b = Math.round(b * vignette);

    const inHead = (x - headCx) ** 2 + (y - headCy) ** 2 <= headR ** 2;
    const inShoulders =
      ((x - shoulderCx) / shoulderRx) ** 2 +
        ((y - shoulderCy) / shoulderRy) ** 2 <=
      1;
    if (inHead || inShoulders) {
      // Blend the silhouette towards white at ~22% opacity.
      r = Math.round(r + (255 - r) * 0.22);
      g = Math.round(g + (255 - g) * 0.22);
      b = Math.round(b + (255 - b) * 0.22);
    }

    this.bitmap.data[idx] = r;
    this.bitmap.data[idx + 1] = g;
    this.bitmap.data[idx + 2] = b;
    this.bitmap.data[idx + 3] = 255;
  });

  const bigFont = await Jimp.loadFont(Jimp.FONT_SANS_128_WHITE);
  const smallFont = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

  image.print(
    bigFont,
    0,
    Math.round(headCy - 64),
    {text: initials, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER},
    size
  );
  image.print(
    smallFont,
    0,
    Math.round(size * 0.86),
    {text: caption, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER},
    size
  );
  image.print(
    smallFont,
    0,
    Math.round(size * 0.9),
    {text: "SAMPLE HEADSHOT", alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER},
    size
  );

  return image.quality(88).getBufferAsync(Jimp.MIME_JPEG);
}

async function seedLeads(
  userId: number,
  leadFields: Array<{id: string; type: string; label: string}>,
  now: number
) {
  const existing = await db
    .select()
    .from(leads)
    .where(eq(leads.userId, userId));
  const sampleExisting = existing.filter((lead) =>
    Array.isArray(lead.tags)
      ? (lead.tags as Array<{id?: string}>).some((t) =>
          String(t?.id || "").startsWith(SAMPLE_MARKER)
        )
      : false
  );

  if (sampleExisting.length > 0) {
    if (!RESET) {
      console.log(
        `[sample] ${sampleExisting.length} sample lead(s) already present; skipping (use --reset to recreate).`
      );
      return;
    }
    for (const lead of sampleExisting) {
      await db.delete(leads).where(eq(leads.id, lead.id));
    }
    console.log(
      `[sample] Deleted ${sampleExisting.length} old sample lead(s).`
    );
  }

  const fieldById = new Map(leadFields.map((f) => [f.id, f]));
  const field = (id: string, fallbackLabel: string, fallbackType: string) =>
    fieldById.get(id) || {id, label: fallbackLabel, type: fallbackType};

  const rows: InsertLead[] = SAMPLE_LEADS.map((sample) => {
    const createdAt = new Date(now - sample.agoHours * HOUR);
    const nameField = field("name", "Full Name", "text");
    const emailField = field("email", "Email", "email");
    const phoneField = field("phone", "Phone", "phone");

    return {
      userId,
      actionId: `user-${userId}`,
      formData: {
        [nameField.id]: {
          value: sample.name,
          type: nameField.type,
          label: nameField.label
        },
        [emailField.id]: {
          value: sample.email,
          type: emailField.type,
          label: emailField.label
        },
        [phoneField.id]: {
          value: sample.phone,
          type: phoneField.type,
          label: phoneField.label
        }
      },
      tags: [
        {id: `${SAMPLE_MARKER}-${uuidv4()}`, label: "Sample", color: "#64748b"},
        ...sample.tags.map((label) => ({
          id: uuidv4(),
          label,
          color: TAG_COLORS[label] || "#64748b"
        }))
      ],
      notes: sample.note
        ? [
            {
              id: uuidv4(),
              content: sample.note,
              createdAt: new Date(
                createdAt.getTime() + 30 * 60 * 1000
              ).toISOString()
            }
          ]
        : [],
      fromQr: sample.fromQr ? "true" : "false",
      ip: null,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      createdAt,
      updatedAt: createdAt
    };
  });

  await db.insert(leads).values(rows);
  console.log(`[sample] Inserted ${rows.length} lead(s) for user ${userId}.`);
}

async function seedHeadshots(userId: number, initials: string, now: number) {
  const existing = await db
    .select()
    .from(headshotRequests)
    .where(
      and(
        eq(headshotRequests.userId, userId),
        like(headshotRequests.generationId, `${SAMPLE_MARKER}-%`)
      )
    );

  if (existing.length > 0) {
    if (!RESET) {
      console.log(
        `[sample] ${existing.length} sample headshot(s) already present; skipping (use --reset to recreate).`
      );
      return;
    }
    for (const row of existing) {
      await db.delete(headshotRequests).where(eq(headshotRequests.id, row.id));
    }
    await db
      .delete(imageStorage)
      .where(
        and(
          eq(imageStorage.userId, userId),
          like(imageStorage.filename, `${SAMPLE_MARKER}-headshot-%`)
        )
      );
    console.log(
      `[sample] Deleted ${existing.length} old sample headshot(s) and their images.`
    );
  }

  for (const [i, sample] of SAMPLE_HEADSHOTS.entries()) {
    const buffer = await renderPlaceholderHeadshot(
      initials,
      sample.setting,
      sample.gradient
    );
    const filename = `${SAMPLE_MARKER}-headshot-${i + 1}-${uuidv4()}.jpg`;
    const [image] = await db
      .insert(imageStorage)
      .values({
        filename,
        originalName: `${sample.settingCategory}-headshot-${i + 1}.jpg`,
        mimetype: Jimp.MIME_JPEG,
        size: buffer.length,
        data: buffer.toString("base64"),
        userId,
        type: "headshot"
      })
      .returning();

    const createdAt = new Date(now - sample.agoHours * HOUR);
    await db.insert(headshotRequests).values({
      userId,
      characterId: null,
      settingCategory: sample.settingCategory,
      setting: sample.setting,
      lighting: sample.lighting,
      expression: sample.expression,
      clothing: sample.clothing,
      status: "completed",
      output: `/api/db-images/${image.id}`,
      error: null,
      referenceImage: null,
      generationId: `${SAMPLE_MARKER}-${i + 1}`,
      createdAt,
      updatedAt: createdAt
    });

    console.log(
      `[sample] Headshot ${i + 1}/${SAMPLE_HEADSHOTS.length}: ${sample.setting} -> /api/db-images/${image.id}`
    );
  }
}

async function main() {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, SAMPLE_EMAIL));

  if (!user) {
    throw new Error(
      `No user with email ${SAMPLE_EMAIL}. Create the account first (see scripts/seed.ts).`
    );
  }

  console.log(
    `[sample] Target user: ${user.email} (id ${user.id}, /${user.publicPath})`
  );

  const leadFields =
    ((user.settings as any)?.leadSettings?.fields as Array<{
      id: string;
      type: string;
      label: string;
    }>) || [];

  // Fixed clock so repeated runs with --reset produce a stable spread of dates.
  const now = Date.now();
  const initials =
    `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() ||
    "??";

  await seedLeads(user.id, leadFields, now);
  await seedHeadshots(user.id, initials, now);
}

main()
  .then(async () => {
    console.log("[sample] Done.");
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[sample] Failed:", err);
    await pool.end();
    process.exit(1);
  });
