import { useState } from "react";
import { GalaxyScene } from "@/components/galaxy/GalaxyScene";
import { ControlPanel } from "@/components/galaxy/ControlPanel";
import { DEFAULT_SETTINGS, type GalaxySettings } from "@/components/galaxy/types";

const Index = () => {
  const [settings, setSettings] = useState<GalaxySettings>(DEFAULT_SETTINGS);

  return (
    <div className="w-screen h-screen overflow-hidden" style={{ background: "#000" }}>
      <GalaxyScene settings={settings} />
      <ControlPanel settings={settings} onChange={setSettings} />
    </div>
  );
};

export default Index;
