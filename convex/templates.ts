import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("templates").first();
    if (existing) return { seeded: false };

    const templates = [
      {
        name: "Classic ATS",
        slug: "classic-ats",
        layoutKey: "classic",
        category: "ats",
        engine: "react-pdf",
        colors: ["#1E3A5F", "#2563EB"],
        fonts: ["Georgia", "Calibri"],
        spacing: "normal",
        sectionOrder: ["summary", "experience", "education", "skills", "projects", "certifications"],
        isActive: true,
      },
      {
        name: "Compact ATS",
        slug: "compact-ats",
        layoutKey: "compact",
        category: "ats",
        engine: "react-pdf",
        colors: ["#111827", "#3B82F6"],
        fonts: ["Arial", "Helvetica"],
        spacing: "compact",
        sectionOrder: ["summary", "experience", "skills", "education", "projects"],
        isActive: true,
      },
      {
        name: "Modern ATS",
        slug: "modern-ats",
        layoutKey: "modern",
        category: "ats",
        engine: "react-pdf",
        colors: ["#0F172A", "#6366F1"],
        fonts: ["Inter", "Source Sans Pro"],
        spacing: "normal",
        sectionOrder: ["summary", "experience", "projects", "skills", "education"],
        isActive: true,
      },
      {
        name: "Sidebar Pro",
        slug: "sidebar-ats",
        layoutKey: "sidebar",
        category: "ats",
        engine: "react-pdf",
        colors: ["#0F766E", "#14B8A6"],
        fonts: ["Inter", "Helvetica"],
        spacing: "normal",
        sectionOrder: ["summary", "experience", "projects", "education", "skills"],
        isActive: true,
      },
      {
        name: "Executive",
        slug: "executive",
        layoutKey: "executive",
        category: "design",
        engine: "react-pdf",
        colors: ["#7C2D12", "#DC2626"],
        fonts: ["Georgia", "Source Serif 4"],
        spacing: "spacious",
        sectionOrder: ["summary", "experience", "achievements", "education", "skills"],
        isActive: true,
      },
      {
        name: "Designer",
        slug: "designer",
        layoutKey: "designer",
        category: "design",
        engine: "react-pdf",
        colors: ["#0891B2", "#06B6D4"],
        fonts: ["Poppins", "Inter"],
        spacing: "normal",
        sectionOrder: ["summary", "projects", "experience", "skills", "education"],
        isActive: true,
      },
    ];

    for (const t of templates) {
      await ctx.db.insert("templates", t);
    }
    return { seeded: true, count: templates.length };
  },
});

export const list = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db
        .query("templates")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
    }
    return await ctx.db
      .query("templates")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("templates")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});
