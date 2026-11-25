module.exports = {
  name: "Haaglanden Voetbal",
  slug: "haaglanden-voetbal",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "haagv",
  userInterfaceStyle: "light",
  android: { package: "nl.haaglandenvoetbal.platform", allowBackup: false },
  plugins: [["expo-secure-store", { configureAndroidBackup: true }]],
  extra: {
    platform: {
      origin: process.env.HVCUP_APP_ORIGIN || "http://10.0.2.2:4175",
      dataMode: process.env.HVCUP_DATA_MODE || "local",
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
    },
  },
};
