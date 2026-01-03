"use client";

import "@copilotkit/react-core/v2/styles.css";
import { useAgent } from "@copilotkit/react-core/v2";
import { AgentState } from "@/lib/types";

interface AgentInfoCardProps {
  themeColor?: string;
}

const colorClasses: Record<string, { border: string; text: string; bg: string }> = {
  blue: { border: "border-blue-500", text: "text-blue-600", bg: "bg-blue-500" },
  red: { border: "border-red-500", text: "text-red-600", bg: "bg-red-500" },
  green: { border: "border-green-500", text: "text-green-600", bg: "bg-green-500" },
  purple: { border: "border-purple-500", text: "text-purple-600", bg: "bg-purple-500" },
  orange: { border: "border-orange-500", text: "text-orange-600", bg: "bg-orange-500" },
  pink: { border: "border-pink-500", text: "text-pink-600", bg: "bg-pink-500" },
  teal: { border: "border-teal-500", text: "text-teal-600", bg: "bg-teal-500" },
};

export function AgentInfoCard({ themeColor = "blue" }: AgentInfoCardProps) {
  const { agent } = useAgent({ agentId: "my_agent" });
  const colors = colorClasses[themeColor] || colorClasses.blue;

  const messageCount = agent.messages?.length ?? 0;
  const proverbCount = agent?.state?.proverbs?.length ?? 0;

  return (
    <div className={`rounded-xl border-2 ${colors.border} bg-zinc-50 p-6 max-w-md w-full mt-6`}>
      <h2 className={`text-2xl font-semibold ${colors.text} mb-4 text-center`}>
        Agent Info
      </h2>
      <hr className={`${colors.border} mb-4`} />

      <div className="flex flex-col gap-3">
        <div className="bg-zinc-100 p-4 rounded-lg flex items-center justify-between">
          <span className="text-zinc-700 font-medium">Status</span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${
              agent.isRunning ? "bg-emerald-500" : "bg-zinc-500"
            }`}
          >
            {agent.isRunning ? "Running" : "Idle"}
          </span>
        </div>

        <div className="bg-zinc-100 p-4 rounded-lg flex items-center justify-between">
          <span className="text-zinc-700 font-medium">Messages</span>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${colors.bg}`}>
            {messageCount}
          </span>
        </div>

        <div className="bg-zinc-100 p-4 rounded-lg flex items-center justify-between">
          <span className="text-zinc-700 font-medium">Proverbs in State</span>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${colors.bg}`}>
            {proverbCount}
          </span>
        </div>

        <div className="bg-zinc-100 p-4 rounded-lg flex items-center justify-between">
          <span className="text-zinc-700 font-medium">Agent Name</span>
          <span className="text-zinc-600 text-sm">{agent.agentId}</span>
        </div>

        <div className="bg-zinc-100 p-4 rounded-lg">
          <span className="text-zinc-700 font-medium block mb-2">
            Agent State
          </span>
          <pre className="text-xs overflow-auto max-h-48 bg-white border border-zinc-200 text-zinc-700 p-3 rounded-md">
            {JSON.stringify(agent.state, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
