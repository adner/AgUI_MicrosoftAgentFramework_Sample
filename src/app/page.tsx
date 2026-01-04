"use client";

import { useState, useEffect } from "react";
import { CopilotSidebar } from "@copilotkit/react-core/v2"
import { CopilotKitProvider, defineToolCallRenderer, useConfigureSuggestions, useFrontendTool} from "@copilotkit/react-core/v2";
import { z } from "zod";
import { AgentPane } from "@/components/AgentPane";

// Extend Window interface for the global sendChatMessage method
declare global {
  interface Window {
    sendChatMessage: (message: string) => void;
  }
}

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
  // HACK: Dirty workaround to programmatically send messages to CopilotSidebar.
  // CopilotKit v2 does not currently expose a hook or API to add messages when using
  // CopilotKitProvider + CopilotSidebar. This uses DOM manipulation to set the textarea
  // value and click the submit button directly.
  useEffect(() => {
    window.sendChatMessage = (message: string) => {
      // Find the textarea in the CopilotSidebar
      const textarea = document.querySelector('textarea[placeholder*="message"], textarea[placeholder*="Message"], textarea') as HTMLTextAreaElement | null;
      if (!textarea) {
        console.error("sendChatMessage: Could not find textarea");
        return;
      }

      // Set the value and trigger input event so React picks up the change
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      nativeInputValueSetter?.call(textarea, message);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));

      // Find and click the submit button with retry logic
      const clickSubmit = (retries = 5) => {
        setTimeout(() => {
          const submitButton = document.querySelector('button:has(svg.lucide-arrow-up)') as HTMLButtonElement | null;
          if (submitButton) {
            submitButton.click();
          } else if (retries > 0) {
            clickSubmit(retries - 1);
          } else {
            console.error("sendChatMessage: Could not find submit button after retries");
          }
        }, 100);
      };
      clickSubmit();
    };

    return () => {
      delete (window as Partial<Window>).sendChatMessage;
    };
  }, []);

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
