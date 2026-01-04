"use client";

import { useMemo } from "react";
import { AgentView } from "./AgentView";

interface SpawnedAgent {
  id: string;
  name: string;
  task: string;
}

interface AgentPaneProps {
  agents: SpawnedAgent[];
}

export function AgentPane({ agents }: AgentPaneProps) {
  // Only show each agent once (first invocation), ignore subsequent invocations
  const uniqueAgents = useMemo(() => {
    const seen = new Set<string>();
    return agents.filter((agent) => {
      if (seen.has(agent.name)) {
        return false;
      }
      seen.add(agent.name);
      return true;
    });
  }, [agents]);

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto bg-slate-50">
      <h2 className="text-lg font-semibold text-slate-700">Spawned Agents</h2>
      {uniqueAgents.length === 0 ? (
        <div className="text-slate-400 text-sm italic">
          No agents spawned yet
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {uniqueAgents.map((agent) => (
            <AgentView key={agent.id} name={agent.name} task={agent.task}/>
          ))}
        </div>
      )}
    </div>
  );
}
