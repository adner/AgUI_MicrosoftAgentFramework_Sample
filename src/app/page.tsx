"use client";

import { useState, useEffect, useMemo } from "react";
import { CopilotSidebar } from "@copilotkit/react-core/v2"
import { CopilotKitProvider, defineToolCallRenderer, useConfigureSuggestions, useFrontendTool, useAgent } from "@copilotkit/react-core/v2";
import { z } from "zod";
import { AgentPane } from "@/components/AgentPane";

// Mutex to prevent concurrent orchestrator updates from multiple child agents
class Mutex {
  private locked = false;
  private queue: (() => void)[] = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.locked = false;
    }
  }
}

const orchestratorMutex = new Mutex();

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
  taskId: string; // Unique ID per invocation
}

export default function CopilotKitPage() {

 const invokeRenderer = defineToolCallRenderer({
    name: "invokeChildAgent",
    args: z.object({
      subagents: z.array(z.object({
        name: z.string(),
        task: z.string(),
      })),
    }),
    render: ({ args, status }) => (
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-md mb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-indigo-600 text-lg">⚡</span>
            </div>
            <span className="font-semibold text-indigo-900">Invoking Child Agent(s)</span>
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
    <CopilotKitProvider runtimeUrl="/api/copilotkit" renderToolCalls={[invokeRenderer]} showDevConsole="auto">
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

      // Find and click the submit button with retry logic and increasing delay
      const clickSubmit = (attempt = 1, maxAttempts = 10) => {
        const delay = attempt * 100; // 100ms, 200ms, 300ms, etc.
        setTimeout(() => {
          const submitButton = document.querySelector('button:has(svg.lucide-arrow-up)') as HTMLButtonElement | null;
          if (submitButton) {
            submitButton.click();
          } else if (attempt < maxAttempts) {
            clickSubmit(attempt + 1, maxAttempts);
          } else {
            console.error("sendChatMessage: Could not find submit button after retries");
          }
        }, delay);
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

  const { agent } = useAgent({ agentId: "orchestratorAgent" });

  // Track all five child agents
  const { agent: childAgent1 } = useAgent({ agentId: "childAgent1" });
  const { agent: childAgent2 } = useAgent({ agentId: "childAgent2" });
  const { agent: childAgent3 } = useAgent({ agentId: "childAgent3" });
  const { agent: childAgent4 } = useAgent({ agentId: "childAgent4" });
  const { agent: childAgent5 } = useAgent({ agentId: "childAgent5" });

  const childAgents = useMemo(() => [
    { id: "childAgent1", agent: childAgent1 },
    { id: "childAgent2", agent: childAgent2 },
    { id: "childAgent3", agent: childAgent3 },
    { id: "childAgent4", agent: childAgent4 },
    { id: "childAgent5", agent: childAgent5 },
  ], [childAgent1, childAgent2, childAgent3, childAgent4, childAgent5]);

  useEffect(() => {
    const subscriptions = childAgents.map(({ agent: childAgent }) =>
      childAgent.subscribe({
        onRunFinishedEvent: async (event) => {
          console.log(`${event.agent.agentId} RUN_FINISHED:`, event);

          const assistantMessages = event.messages.filter(msg => msg.role === "assistant");
          console.log("Assistant messages:", assistantMessages);

          const combinedContent = assistantMessages.map(msg => msg.content).join("\n");

          await orchestratorMutex.acquire();
          try {
            agent.addMessage({
              id: crypto.randomUUID(),
              role: "user",
              content: `Result from ${event.agent.agentId}: ${combinedContent}`
            });

            await agent.runAgent();
            await new Promise(resolve => setTimeout(resolve, 500));
          } finally {
            orchestratorMutex.release();
          }
        }
      })
    );

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [childAgents, agent]);

  useFrontendTool({
    name: "invokeChildAgent",
    description: "Invoke child agents to perform tasks. Each agent specified will be triggered with its assigned task. Use getRunningAgents first to check which agents are available.",
    parameters: z.object({
      subagents: z.array(z.object({
        name: z.string(),
        task: z.string(),
      })),
    }),
    handler: async ({ subagents }) => {
      const agentsWithIds = subagents.map(agent => ({
        ...agent,
        id: agent.name, // Use agent name as constant ID
        taskId: crypto.randomUUID(), // Unique ID per invocation
      }));
      onSpawn(prev => [...prev, ...agentsWithIds]);
      return `Invoked child agents: ${subagents.map(a => a.name).join(", ")}`;
    },
  });

  useFrontendTool({
    name: "getRunningAgents",
    description: "Get the current status of all five child agents (childAgent1 through childAgent5). Returns whether each agent is currently running or available. Use this to check agent availability before invoking tasks, or to monitor ongoing task progress. An agent must be available (not running) to accept a new task.",
    parameters: z.object({}),
    handler: async () => {
      const statuses = childAgents.map(({ id, agent }) => ({
        agentId: id,
        isRunning: agent.isRunning,
        available: !agent.isRunning,
      }));

      const runningCount = statuses.filter(s => s.isRunning).length;
      const availableCount = statuses.filter(s => s.available).length;

      return JSON.stringify({
        agents: statuses,
        summary: {
          totalAgents: 5,
          running: runningCount,
          available: availableCount,
        }
      });
    },
  });

  return <CopilotSidebar defaultOpen={true} width="50%" agentId="orchestratorAgent" threadId="orchestratorThread"/>;
}
