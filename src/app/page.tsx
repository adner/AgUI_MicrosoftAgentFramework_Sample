"use client";

import { useState } from "react";
import { CopilotSidebar } from "@copilotkit/react-core/v2"
import { CopilotKitProvider, defineToolCallRenderer, useConfigureSuggestions, useFrontendTool} from "@copilotkit/react-core/v2";
import { z } from "zod";
import { AgentPane } from "@/components/AgentPane";

interface SpawnedAgent {
  id: string;
  name: string;
  task: string;
}

export default function CopilotKitPage() {

 const spawnRenderer = defineToolCallRenderer({
    name: "spawnChildagents",
    args: z.object({
      subagents: z.array(z.object({
        name: z.string(),
        task: z.string(),
      })),
    }),
    render: ({ args, status }) => (
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-600 text-lg">⚡</span>
            </div>
            <span className="font-semibold text-indigo-900">Spawning Subagents</span>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            status === "complete"
              ? "bg-green-100 text-green-700"
              : status === "executing"
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-600"
          }`}>
            {status}
          </span>
        </div>
        <div className="space-y-2">
          {args?.subagents?.map((agent, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white border border-slate-100">
              <div className="w-6 h-6 rounded-md bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {i + 1}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-slate-800 text-sm">{agent.name}</div>
                <div className="text-slate-500 text-xs mt-0.5">{agent.task}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  });

  return (
    <CopilotKitProvider runtimeUrl="/api/copilotkit" renderToolCalls={[spawnRenderer]} showDevConsole="auto">
      <AppLayout />
    </CopilotKitProvider>
  );
}

function AppLayout() {
  const [spawnedAgents, setSpawnedAgents] = useState<SpawnedAgent[]>([]);

  return (
    <div className="flex h-screen w-full">
      <AgentPane agents={spawnedAgents} />
      <SidebarChat onSpawn={setSpawnedAgents} />
    </div>
  );
}

interface SidebarChatProps {
  onSpawn: React.Dispatch<React.SetStateAction<SpawnedAgent[]>>;
}

function SidebarChat({ onSpawn }: SidebarChatProps) {
  useConfigureSuggestions({
    instructions: "Suggest tasks for childagents.",
  });

  useFrontendTool({
    name: "spawnChildagents",
    description: "Spawn a number of subagents that perform different tasks.",
    parameters: z.object({
      subagents: z.array(z.object({
        name: z.string(),
        task: z.string(),
      })),
    }),
    handler: async ({ subagents }) => {
      const agentsWithIds = subagents.map(agent => ({
        ...agent,
        id: crypto.randomUUID(),
      }));
      onSpawn(prev => [...prev, ...agentsWithIds]);
      return `Spawned subagents: ${subagents.map(a => a.name).join(", ")}`;
    },
  });

  return <CopilotSidebar defaultOpen={true} width="50%" agentId="orchestratorAgent" threadId="orchestratorThread"/>;
}
