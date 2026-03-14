import { CMSPage } from "../models/index.js";

class CMSService {
  async getPageBySlug(slug) {
    const page = await CMSPage.findOne({
      where: { slug: slug.toLowerCase(), is_active: true },
    });
    if (!page) throw new Error("Requested page not found");
    return page;
  }

  async getAllPages() {
    return await CMSPage.findAll({
      order: [["title", "ASC"]],
    });
  }

  async createOrUpdatePage(data) {
    const { slug, title, content, is_active } = data;
    if (!slug || !title || !content) {
      throw new Error("Slug, Title and Content are required");
    }

    const cleanContent = content.replace(/<[^>]*>?/gm, "");

    const [page, created] = await CMSPage.findOrCreate({
      where: { slug: slug.toLowerCase() },
      defaults: {
        title,
        content: cleanContent,
        is_active: is_active !== undefined ? is_active : true,
      },
    });

    if (!created) {
      await page.update({
        title,
        content: cleanContent,
        is_active: is_active !== undefined ? is_active : page.is_active,
      });
    }

    return page;
  }

  async deletePage(id) {
    const page = await CMSPage.findByPk(id);
    if (!page) throw new Error("Page not found");
    await page.destroy();
    return true;
  }

  // Pre-seed some pages if they don't exist
  async seedPages() {
    const defaultPages = [
      {
        slug: "about-us",
        title: "About Us",
        content: "<h1>About Us</h1><p>Coming Soon...</p>",
      },
      {
        slug: "privacy-policy",
        title: "Privacy Policy",
        content: "<h1>Privacy Policy</h1><p>Coming Soon...</p>",
      },
      {
        slug: "terms-conditions",
        title: "Terms & Conditions",
        content: "<h1>Terms & Conditions</h1><p>Coming Soon...</p>",
      },
      {
        slug: "refund-policy",
        title: "Refund Policy",
        content:
          "<h1>Refund Policy</h1><p>Customers are eligible to request a refund within 7 days from the date of delivery. After 7 days, refund requests will not be accepted.</p>",
      },
      {
        slug: "faq",
        title: "FAQ",
        content: "<h1>Frequently Asked Questions</h1><p>Coming Soon...</p>",
      },
    ];

    for (const p of defaultPages) {
      const cleanContent = p.content.replace(/<[^>]*>?/gm, "");
      await CMSPage.findOrCreate({
        where: { slug: p.slug },
        defaults: { ...p, content: cleanContent },
      });
    }
  }
}

export default new CMSService();
