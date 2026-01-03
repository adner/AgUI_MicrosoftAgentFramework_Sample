"use client";

import { ProverbsCard } from "@/components/proverbs";
import { WeatherCard } from "@/components/weather";
import { MoonCard } from "@/components/moon";
import {
  useCoAgent,
  useFrontendTool,
  useHumanInTheLoop,
  useRenderToolCall,
} from "@copilotkit/react-core";
import { CopilotKitCSSProperties, CopilotSidebar } from "@copilotkit/react-ui";
import { useAgent, CopilotChat } from "@copilotkit/react-core/v2"
import { useState } from "react";
import { AgentState } from "@/lib/types";
import { AgentInfoCard } from "@/components/agentInfo";
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotKitProvider } from "@copilotkit/react-core/v2";
import { th } from "zod/v4/locales";

export default function CopilotKitPage() {
  return (
    <CopilotKitProvider runtimeUrl="/api/copilotkit">
      <MainContent/>
      <MainContent agentId="childAgent"/>
    </CopilotKitProvider>
  );
}

interface MainContentProps {
  agentId?: string;
}


function MainContent({ agentId = "default" }: MainContentProps) {
  const [themeColor, setThemeColor] = useState("#6366f1");

  // 🪁 Frontend Actions: https://docs.copilotkit.ai/microsoft-agent-framework/frontend-actions
  useFrontendTool({
    name: "setThemeColor",
    description: "Set the theme color of the application",
    parameters: [
      {
        name: "themeColor",
        type: "string",
        description: "The theme color to set. Make sure to pick nice colors.",
        required: true,
      },
    ],
    handler: async ({ themeColor }) => {
      setThemeColor(themeColor);
    },
  });

  return (
    <main>
      <AgentInfoCard themeColor={themeColor} agentId={ agentId }/>
      <CopilotChat input={{style: { border: `2px solid ${themeColor}` }}} threadId={agentId + "_thread"} agentId={ agentId }/>
    </main>
  );
}

function YourMainContent({ themeColor }: { themeColor: string }) {
  // 🪁 Shared State: https://docs.copilotkit.ai/pydantic-ai/shared-state
  const { state, setState } = useCoAgent<AgentState>({
    name: "my_agent",
    initialState: {
      proverbs: [
        
      ],
    },
  });

  //🪁 Generative UI: https://docs.copilotkit.ai/pydantic-ai/generative-ui
  useRenderToolCall(
    {
      name: "get_weather",
      description: "Get the weather for a given location.",
      parameters: [{ name: "location", type: "string", required: true }],
      render: ({ args }) => {
        return <WeatherCard location={args.location} themeColor={themeColor} />;
      },
    },
    [themeColor],
  );

  // 🪁 Human In the Loop: https://docs.copilotkit.ai/microsoft-agent-framework/human-in-the-loop/frontend-tool-based
  useHumanInTheLoop(
    {
      name: "go_to_moon",
      description: "Go to the moon on request.",
      render: ({ respond, status }) => {
        return (
          <MoonCard themeColor={themeColor} status={status} respond={respond} />
        );
      },
    },
    [themeColor],
  );

  return (
    <div
      style={{ backgroundColor: themeColor }}
      className="h-screen flex justify-center items-center flex-col transition-colors duration-300"
    >
      <ProverbsCard state={state} setState={setState} />
      <AgentInfoCard themeColor={themeColor} />
    </div>
  );
}
