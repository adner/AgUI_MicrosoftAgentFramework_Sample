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
      <div className="rounded-xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-100 to-white p-2 shadow-md mb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center">
              <span className="text-indigo-700 text-sm">⚡</span>
            </div>
            <span className="font-semibold text-indigo-800 text-sm">Invoking Child Agent(s)</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            status === "complete"
              ? "bg-emerald-200 text-emerald-800"
              : status === "executing"
                ? "bg-orange-200 text-orange-800 animate-pulse"
                : "bg-indigo-200 text-indigo-800"
          }`}>
            {status}
          </span>
        </div>
        <div className="space-y-1">
          {args?.subagents?.map((agent, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white border border-indigo-200">
              <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {i + 1}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-slate-800 text-sm">{agent.name}</div>
                <div className="text-slate-500 text-xs">{agent.task}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  });

  const partyRenderer = defineToolCallRenderer({
    name: "ExecuteFetch",
    args: z.object({ fetchXmlRequest: z.string() }),
    render: ({ args, status }) => (
      <div className="rounded-xl border-2 border-purple-300 bg-gradient-to-br from-purple-100 to-white px-2 py-1.5 shadow-md mb-2">
        <div className="flex items-center justify-between h-7 mb-1">
          <div className="flex items-center gap-1.5">
            <img
              src="https://i0.wp.com/hatfullofdata.blog/wp-content/uploads/2021/04/Dataverse_1600x1600.png?fit=120%2C120&ssl=1"
              alt="Dataverse"
              className="w-5 h-5 rounded-full"
            />
            <span className="font-semibold text-purple-800 text-sm leading-none">Dataverse Query</span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            status === "complete"
              ? "bg-emerald-200 text-emerald-800"
              : status === "executing"
                ? "bg-orange-200 text-orange-800 animate-pulse"
                : "bg-purple-200 text-purple-800"
          }`}>
            {status === "inProgress" ? "Running query..." : status}
          </span>
        </div>
        <div className="p-2 rounded-lg bg-white border border-purple-200">
          <div className="text-xs font-semibold text-purple-600 mb-1">FetchXML Request</div>
          <pre className="text-xs text-slate-800 bg-slate-100 p-2 rounded-md overflow-x-auto whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
            {args?.fetchXmlRequest || "Running query..."}
          </pre>
        </div>
      </div>
    ),
  });

  return (
    <CopilotKitProvider runtimeUrl="/api/copilotkit" renderToolCalls={[invokeRenderer, partyRenderer]} showDevConsole="auto">
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

          const lastMessage = assistantMessages.at(-1)?.content ?? "";

          await orchestratorMutex.acquire();
          try {
            agent.addMessage({
              id: crypto.randomUUID(),
              role: "user",
              content: `Result from ${event.agent.agentId}: ${lastMessage}`
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
