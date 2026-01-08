"use client";

import { useMemo } from "react";
import { AgentView } from "./AgentView";

interface SpawnedAgent {
  id: string;
  name: string;
  task: string;
  taskId: string;
}

interface AgentPaneProps {
  agents: SpawnedAgent[];
}

export function AgentPane({ agents }: AgentPaneProps) {
  // Show each agent once, but use the latest task for each agent
  const uniqueAgents = useMemo(() => {
    const agentMap = new Map<string, SpawnedAgent>();
    for (const agent of agents) {
      agentMap.set(agent.name, agent); // Later entries override earlier ones
    }
    return Array.from(agentMap.values());
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
            <AgentView key={agent.id} name={agent.name} task={agent.task} taskId={agent.taskId}/>
          ))}
        </div>
      )}
    </div>
  );
}
