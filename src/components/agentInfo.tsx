"use client";

import { useAgent } from "@copilotkit/react-core/v2";
import { AgentState } from "@/lib/types";

export interface AgentInfoCardProps {
  themeColor: string;
}

export function AgentInfoCard({ themeColor }: AgentInfoCardProps) {
  const { agent } = useAgent({ agentId: "my_agent"});

  const messageCount = agent.messages?.length ?? 0;
  const proverbCount = agent?.state?.proverbs?.length ?? 0;

  return (
    <div className="bg-white/20 backdrop-blur-md p-6 rounded-2xl shadow-xl max-w-md w-full mt-6">
      <h2 className="text-2xl font-bold text-white mb-4 text-center">
        Agent Info
      </h2>
      <hr className="border-white/20 mb-4" />

      <div className="flex flex-col gap-3">
        <div className="bg-white/15 p-4 rounded-xl flex items-center justify-between">
          <span className="text-white font-medium">Status</span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              agent.isRunning
                ? "bg-green-500/80 text-white"
                : "bg-gray-500/80 text-white"
            }`}
          >
            {agent.isRunning ? "Running" : "Idle"}
          </span>
        </div>

        <div className="bg-white/15 p-4 rounded-xl flex items-center justify-between">
          <span className="text-white font-medium">Messages</span>
          <span
            className="px-3 py-1 rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: `${themeColor}99` }}
          >
            {messageCount}
          </span>
        </div>

        <div className="bg-white/15 p-4 rounded-xl flex items-center justify-between">
          <span className="text-white font-medium">Proverbs in State</span>
          <span
            className="px-3 py-1 rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: `${themeColor}99` }}
          >
            {proverbCount}
          </span>
        </div>

        <div className="bg-white/15 p-4 rounded-xl flex items-center justify-between">
          <span className="text-white font-medium">Agent Name</span>
          <span className="text-white/80 text-sm">{agent.agentId}</span>
        </div>

        <div className="bg-white/15 p-4 rounded-xl">
          <span className="text-white font-medium block mb-2">Agent State</span>
          <pre className="text-white/80 text-xs overflow-auto max-h-48 bg-black/20 p-3 rounded-lg">
            {JSON.stringify(agent.state, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
