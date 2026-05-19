const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Header, Footer,
        AlignmentType, HeadingLevel, BorderStyle, PageNumber,
        LevelFormat, ExternalHyperlink } = require('docx');

// Helper function for standard paragraphs
function p(text, options = {}) {
  const runs = [];
  if (typeof text === 'string') {
    runs.push(new TextRun({ text, font: "Arial", size: 22, ...options }));
  } else if (Array.isArray(text)) {
    text.forEach(t => {
      if (typeof t === 'string') {
        runs.push(new TextRun({ text: t, font: "Arial", size: 22 }));
      } else {
        runs.push(new TextRun({ font: "Arial", size: 22, ...t }));
      }
    });
  }
  return new Paragraph({ spacing: { after: 160 }, children: runs });
}

// Section heading
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, font: "Arial", size: 28, bold: true, color: "2E75B6" })],
  });
}

// Bold + normal text paragraph
function mixedP(parts) {
  return new Paragraph({
    spacing: { after: 160 },
    children: parts.map(p => new TextRun({ font: "Arial", size: 22, ...p })),
  });
}

// Bullet item
function bullet(text, options = {}) {
  const runs = [];
  if (typeof text === 'string') {
    runs.push(new TextRun({ text, font: "Arial", size: 22, ...options }));
  } else if (Array.isArray(text)) {
    text.forEach(t => {
      if (typeof t === 'string') {
        runs.push(new TextRun({ text: t, font: "Arial", size: 22 }));
      } else {
        runs.push(new TextRun({ font: "Arial", size: 22, ...t }));
      }
    });
  }
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80 },
    children: runs,
  });
}

// Link paragraph
function linkPara(label, url) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: label, font: "Arial", size: 22, bold: true }),
      new ExternalHyperlink({
        children: [new TextRun({ text: url, style: "Hyperlink", font: "Arial", size: 22 })],
        link: url,
      }),
    ],
  });
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 22, color: "333333" },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "1A1A1A" },
        paragraph: { spacing: { before: 400, after: 240 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "2E75B6" },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "333333" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    }],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "AI Hub - Dev.to Article", font: "Arial", size: 18, color: "999999", italics: true })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Page ", font: "Arial", size: 18, color: "999999" }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: "999999" }),
          ],
        })],
      }),
    },
    children: [
      // ===== TITLE =====
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({
          text: "I Built an Open-Source AI Tools Directory with 850+ Tools \u2014 Here\u2019s Why and How",
          font: "Arial", size: 36, bold: true, color: "1A1A1A",
        })],
      }),

      // ===== TL;DR =====
      new Paragraph({
        spacing: { before: 200, after: 200 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6", space: 8 },
          left: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6", space: 8 },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6", space: 8 },
          right: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6", space: 8 },
        },
        children: [
          new TextRun({ text: "TL;DR: ", font: "Arial", size: 22, bold: true, color: "2E75B6" }),
          new TextRun({
            text: "An open-source, cyberpunk-styled AI tools navigation site with 850+ curated tools, real-time updates, trending charts, and community features. Built with Next.js + Prisma + Supabase. Free to use and fully open-source on GitHub.",
            font: "Arial", size: 22, color: "333333",
          }),
        ],
      }),

      // ===== THE PROBLEM =====
      h2("The Problem"),
      p("Every day, a dozen new AI tools pop up. ChatGPT, Claude, Midjourney, Runway, Perplexity\u2026 the list never ends. I found myself bookmarking tools across different tabs, forgetting about useful ones, and having no way to compare them side by side."),
      p("So I built AI Hub \u2014 a centralized directory that does three things:"),
      bullet([{ text: "Curates \u2014 ", bold: true }, { text: "850+ AI tools across 16 categories (chat, image, video, code, audio, writing, and more)" }]),
      bullet([{ text: "Keeps fresh \u2014 ", bold: true }, { text: "Daily crawlers fetch new tools from GitHub, Product Hunt, and RSS feeds" }]),
      bullet([{ text: "Lets you contribute \u2014 ", bold: true }, { text: "Share tools, write comments, and engage with the community" }]),

      // ===== TECH STACK =====
      h2("Tech Stack"),
      bullet([{ text: "Frontend: ", bold: true }, { text: "Next.js 14 (App Router) + Tailwind CSS" }]),
      bullet([{ text: "Backend: ", bold: true }, { text: "Next.js API Routes" }]),
      bullet([{ text: "Database: ", bold: true }, { text: "Prisma + Supabase (PostgreSQL)" }]),
      bullet([{ text: "Deployment: ", bold: true }, { text: "Vercel" }]),
      bullet([{ text: "Crawlers: ", bold: true }, { text: "GitHub API, RSS, custom scripts (daily via GitHub Actions)" }]),

      // ===== FEATURES =====
      h2("Features That Stand Out"),

      h3("🏠 Homepage with Real-time News & Trends"),
      p("Not just a boring list. The homepage shows the latest AI news, trending tools, and community shares \u2014 all updated daily."),

      h3("🔍 Smart Search with Relevance Scoring"),
      p("Search by name, description, or tags with keyword-based relevance sorting. Results are weighted \u2014 exact matches rank higher than partial ones."),

      h3("📊 Trend Charts for Every Tool"),
      p("Each tool page shows a 7-day popularity trend chart. See which tools are gaining traction at a glance."),

      h3("🎨 Cyberpunk UI"),
      p("Dark theme with neon green (#00ff88), cyan (#00d4ff), and magenta (#ff00ff) accents. CRT scanlines, glitch effects, and clip-path chamfer corners. Because AI tools deserve a futuristic look."),

      h3("👥 Community Features"),
      bullet("Share tools with others"),
      bullet("Write comments and reviews"),
      bullet("\u201CLife Circle\u201D feed for community posts"),
      bullet("User profiles with activity history"),

      h3("🔄 Daily Auto-Crawling"),
      p("New tools are automatically discovered and imported from:"),
      bullet("GitHub API (recent AI projects)"),
      bullet("Product Hunt (AI-related launches)"),
      bullet("RSS feeds from major tech publications"),
      bullet("Manual submissions with admin review"),

      // ===== WHAT'S NEXT =====
      h2("What\u2019s Next"),
      p("I\u2019m actively working on:"),
      bullet([{ text: "Phase 1: ", bold: true }, { text: "Notification system for tool updates and community interactions" }]),
      bullet([{ text: "Phase 2: ", bold: true }, { text: "Points and level system to reward contributors" }]),
      bullet([{ text: "Phase 3: ", bold: true }, { text: "Deeper social features and ecosystem expansion" }]),

      // ===== TRY IT OUT =====
      h2("Try It Out"),
      linkPara("Live site: ", "https://ai999999.top"),
      linkPara("GitHub: ", "https://github.com/YD4223/aihub"),
      p("It\u2019s completely free, open-source, and I\u2019d love to hear your feedback. If you find it useful, drop a \u2605 on GitHub \u2014 it helps more people discover it."),

      // ===== SPACER =====
      new Paragraph({ spacing: { before: 200 }, children: [] }),

      // ===== SEPARATOR =====
      new Paragraph({
        border: {
          top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 8 },
        },
        spacing: { before: 200, after: 120 },
        children: [],
      }),

      // ===== CLOSING =====
      p([
        { text: "Have you built something similar? Or know an AI tool that should be listed? Let me know in the comments!", italics: true, color: "666666" },
      ]),
    ],
  }],
});

// Helper for h3 function used above
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, font: "Arial", size: 24, bold: true, color: "333333" })],
  });
}

// Regenerate the doc with h3
const doc2 = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 22, color: "333333" },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "1A1A1A" },
        paragraph: { spacing: { before: 400, after: 240 }, outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "2E75B6" },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "333333" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    }],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "AI Hub - Dev.to Article", font: "Arial", size: 18, color: "999999", italics: true })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Page ", font: "Arial", size: 18, color: "999999" }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: "999999" }),
          ],
        })],
      }),
    },
    children: [
      // ===== TITLE =====
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [new TextRun({
          text: "I Built an Open-Source AI Tools Directory with 850+ Tools \u2014 Here\u2019s Why and How",
          font: "Arial", size: 36, bold: true, color: "1A1A1A",
        })],
      }),

      // ===== TL;DR =====
      new Paragraph({
        spacing: { before: 200, after: 200 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6", space: 8 },
          left: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6", space: 8 },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6", space: 8 },
          right: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6", space: 8 },
        },
        children: [
          new TextRun({ text: "TL;DR: ", font: "Arial", size: 22, bold: true, color: "2E75B6" }),
          new TextRun({
            text: "An open-source, cyberpunk-styled AI tools navigation site with 850+ curated tools, real-time updates, trending charts, and community features. Built with Next.js + Prisma + Supabase. Free to use and fully open-source on GitHub.",
            font: "Arial", size: 22, color: "333333",
          }),
        ],
      }),

      // ===== THE PROBLEM =====
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 320, after: 160 },
        children: [new TextRun({ text: "The Problem", font: "Arial", size: 28, bold: true, color: "2E75B6" })],
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: "Every day, a dozen new AI tools pop up. ChatGPT, Claude, Midjourney, Runway, Perplexity\u2026 the list never ends. I found myself bookmarking tools across different tabs, forgetting about useful ones, and having no way to compare them side by side.", font: "Arial", size: 22, color: "333333" })],
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: "So I built AI Hub \u2014 a centralized directory that does three things:", font: "Arial", size: 22, color: "333333" })],
      }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 }, children: [
        new TextRun({ text: "Curates \u2014 ", font: "Arial", size: 22, bold: true }),
        new TextRun({ text: "850+ AI tools across 16 categories (chat, image, video, code, audio, writing, and more)", font: "Arial", size: 22 }),
      ]}),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 }, children: [
        new TextRun({ text: "Keeps fresh \u2014 ", font: "Arial", size: 22, bold: true }),
        new TextRun({ text: "Daily crawlers fetch new tools from GitHub, Product Hunt, and RSS feeds", font: "Arial", size: 22 }),
      ]}),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 80 }, children: [
        new TextRun({ text: "Lets you contribute \u2014 ", font: "Arial", size: 22, bold: true }),
        new TextRun({ text: "Share tools, write comments, and engage with the community", font: "Arial", size: 22 }),
      ]}),

      // ===== TECH STACK =====
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 320, after: 160 },
        children: [new TextRun({ text: "Tech Stack", font: "Arial", size: 28, bold: true, color: "2E75B6" })],
      }),
      ...[
        ["Frontend: ", "Next.js 14 (App Router) + Tailwind CSS"],
        ["Backend: ", "Next.js API Routes"],
        ["Database: ", "Prisma + Supabase (PostgreSQL)"],
        ["Deployment: ", "Vercel"],
        ["Crawlers: ", "GitHub API, RSS, custom scripts (daily via GitHub Actions)"],
      ].map(([bold, normal]) => new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: bold, font: "Arial", size: 22, bold: true }),
          new TextRun({ text: normal, font: "Arial", size: 22 }),
        ],
      })),

      // ===== FEATURES =====
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 320, after: 160 },
        children: [new TextRun({ text: "Features That Stand Out", font: "Arial", size: 28, bold: true, color: "2E75B6" })],
      }),

      // Homepage
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: "\uD83C\uDFE0 Homepage with Real-time News & Trends", font: "Arial", size: 24, bold: true, color: "333333" })],
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: "Not just a boring list. The homepage shows the latest AI news, trending tools, and community shares \u2014 all updated daily.", font: "Arial", size: 22, color: "333333" })],
      }),

      // Smart Search
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: "\uD83D\uDD0D Smart Search with Relevance Scoring", font: "Arial", size: 24, bold: true, color: "333333" })],
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: "Search by name, description, or tags with keyword-based relevance sorting. Results are weighted \u2014 exact matches rank higher than partial ones.", font: "Arial", size: 22, color: "333333" })],
      }),

      // Trend Charts
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: "\uD83D\uDCCA Trend Charts for Every Tool", font: "Arial", size: 24, bold: true, color: "333333" })],
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: "Each tool page shows a 7-day popularity trend chart. See which tools are gaining traction at a glance.", font: "Arial", size: 22, color: "333333" })],
      }),

      // Cyberpunk UI
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: "\uD83C\uDFA8 Cyberpunk UI", font: "Arial", size: 24, bold: true, color: "333333" })],
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: "Dark theme with neon green (#00ff88), cyan (#00d4ff), and magenta (#ff00ff) accents. CRT scanlines, glitch effects, and clip-path chamfer corners. Because AI tools deserve a futuristic look.", font: "Arial", size: 22, color: "333333" })],
      }),

      // Community
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: "\uD83D\uDC65 Community Features", font: "Arial", size: 24, bold: true, color: "333333" })],
      }),
      ...["Share tools with others", "Write comments and reviews", "\u201CLife Circle\u201D feed for community posts", "User profiles with activity history"].map(t => new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 80 },
        children: [new TextRun({ text: t, font: "Arial", size: 22 })],
      })),

      // Auto-Crawling
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: "\uD83D\uDD04 Daily Auto-Crawling", font: "Arial", size: 24, bold: true, color: "333333" })],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: "New tools are automatically discovered and imported from:", font: "Arial", size: 22, color: "333333" })],
      }),
      ...["GitHub API (recent AI projects)", "Product Hunt (AI-related launches)", "RSS feeds from major tech publications", "Manual submissions with admin review"].map(t => new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 80 },
        children: [new TextRun({ text: t, font: "Arial", size: 22 })],
      })),

      // ===== WHAT'S NEXT =====
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 320, after: 160 },
        children: [new TextRun({ text: "What\u2019s Next", font: "Arial", size: 28, bold: true, color: "2E75B6" })],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: "I\u2019m actively working on:", font: "Arial", size: 22, color: "333333" })],
      }),
      ...[
        ["Phase 1: ", "Notification system for tool updates and community interactions"],
        ["Phase 2: ", "Points and level system to reward contributors"],
        ["Phase 3: ", "Deeper social features and ecosystem expansion"],
      ].map(([bold, normal]) => new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: bold, font: "Arial", size: 22, bold: true }),
          new TextRun({ text: normal, font: "Arial", size: 22 }),
        ],
      })),

      // ===== TRY IT OUT =====
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 320, after: 160 },
        children: [new TextRun({ text: "Try It Out", font: "Arial", size: 28, bold: true, color: "2E75B6" })],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "Live site: ", font: "Arial", size: 22, bold: true }),
          new ExternalHyperlink({
            children: [new TextRun({ text: "https://ai999999.top", style: "Hyperlink", font: "Arial", size: 22 })],
            link: "https://ai999999.top",
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: "GitHub: ", font: "Arial", size: 22, bold: true }),
          new ExternalHyperlink({
            children: [new TextRun({ text: "https://github.com/YD4223/aihub", style: "Hyperlink", font: "Arial", size: 22 })],
            link: "https://github.com/YD4223/aihub",
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: "It\u2019s completely free, open-source, and I\u2019d love to hear your feedback. If you find it useful, drop a \u2605 on GitHub \u2014 it helps more people discover it.", font: "Arial", size: 22, color: "333333" })],
      }),

      // ===== DIVIDER =====
      new Paragraph({
        spacing: { before: 200, after: 120 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC", space: 8 } },
        children: [],
      }),

      // ===== CLOSING =====
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: "Have you built something similar? Or know an AI tool that should be listed? Let me know in the comments!", font: "Arial", size: 22, italics: true, color: "666666" })],
      }),
    ],
  }],
});

const outputPath = "C:\\Users\\Lenovo\\WorkBuddy\\20260407193651\\AI-Hub-Dev.to-Article.docx";
Packer.toBuffer(doc2).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log("Document created at: " + outputPath);
}).catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
