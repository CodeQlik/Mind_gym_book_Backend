import { Setting } from "../models/index.js";

class SettingService {
  async getSettings() {
    let settings = await Setting.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = await Setting.create({
        site_name: "Mind Gym Book",
        contact_email: "support@mindgymbook.com",
        contact_phone: "+1234567890",
        address: "123 Main St, City, Country",
        copyright_text: "© 2026 Mind Gym Book. All rights reserved.",
      });
    }
    return settings;
  }

  async updateSettings(data) {
    let settings = await Setting.findOne();
    if (!settings) {
      return await Setting.create(data);
    }
    await settings.update(data);
    return settings;
  }
}

export default new SettingService();
