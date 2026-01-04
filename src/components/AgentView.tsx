"use client";

import { useEffect, useRef } from "react";
import { useAgent } from "@copilotkit/react-core/v2";

interface AgentViewProps {
  name: string;
  task: string;
}

export function AgentView({ name, task }: AgentViewProps) {
  const { agent } = useAgent({ agentId: name });
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

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
  }, [agent, task]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-medium text-slate-800">{name}</span>
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            agent.isRunning
              ? "bg-emerald-100 text-emerald-700"
              : "bg-zinc-100 text-zinc-500"
          }`}
        >
          {agent.isRunning ? "Running" : "Idle"}
        </span>
      </div>
    </div>
  );
}
