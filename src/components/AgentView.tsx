"use client";

import { useEffect, useRef, useState } from "react";
import { useAgent, CopilotChatMessageView } from "@copilotkit/react-core/v2";

interface AgentViewProps {
  name: string;
  task: string;
  taskId: string;
}

export function AgentView({ name, task, taskId }: AgentViewProps) {
  const { agent } = useAgent({ agentId: name });

  const executedTaskIdRef = useRef<string | null>(null);
  const [showMessages, setShowMessages] = useState(false);

  useEffect(() => {
    // Only run if this is a new invocation (different taskId)
    if (executedTaskIdRef.current === taskId) return;
    executedTaskIdRef.current = taskId;

    const startAgent = async () => {
      agent.addMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: task,
      });
      const result = await agent.runAgent();
      console.log(`Agent ${name} completed:`, result);
    };

    startAgent();
  }, [agent, task, taskId, name]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-800">{name}</span>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              agent.isRunning
                ? "bg-emerald-100 text-emerald-700"
                : "bg-zinc-100 text-zinc-500"
            }`}
          >
            {agent.isRunning ? "Running" : "Idle"}
          </span>
          <button
            onClick={() => setShowMessages(!showMessages)}
            className="px-2 py-1 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600"
          >
            {showMessages ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      {showMessages && (
        <div className="mt-2">
          <CopilotChatMessageView messages={agent.messages} isRunning={agent.isRunning}/>
        </div>
      )}
    </div>
  );
}
