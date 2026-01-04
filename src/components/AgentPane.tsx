"use client";

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
  return (
    <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto bg-slate-50">
      <h2 className="text-lg font-semibold text-slate-700">Spawned Agents</h2>
      {agents.length === 0 ? (
        <div className="text-slate-400 text-sm italic">
          No agents spawned yet
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {agents.map((agent) => (
            <AgentView key={agent.id} name={agent.name} task={agent.task}/>
          ))}
        </div>
      )}
    </div>
  );
}
