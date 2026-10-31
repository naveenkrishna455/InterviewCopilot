import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("desktop", {
  appVersion: process.env.npm_package_version ?? "0.1.0",
});
