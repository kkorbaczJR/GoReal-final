import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.goreal.app",
  appName: "GoReal",
  webDir: "out",
  backgroundColor: "#ffffff",
  android: {
    allowMixedContent: false,
  },
};

export default config;
