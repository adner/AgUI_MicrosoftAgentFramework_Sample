import { HttpAgent } from "@ag-ui/client";
import { NextRequest } from "next/server";
import { BuiltInAgent, CopilotRuntime, InMemoryAgentRunner, createCopilotEndpoint } from "@copilotkit/runtime/v2"
import { handle } from "hono/vercel";

const determineModel = () => {
  if (process.env.OPENAI_API_KEY?.trim()) {
    return "openai/gpt-4o";
  }
  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    return "anthropic/claude-sonnet-4.5";
  }
  if (process.env.GOOGLE_API_KEY?.trim()) {
    return "google/gemini-2.5-pro";
  }
  return "openai/gpt-4o";
};

const myPirateAgent = new BuiltInAgent({
  model: determineModel(),
  prompt: "You are an agent that orchestrates a number of child agents. If the user makes a request, delegate the completion of the request to one or many subagents. You have access to the tool spawnChildagents that allows you to spawn subagents.",
  temperature: 0.7,
});

// 2. Create the CopilotRuntime instance and utilize the Microsoft Agent Framework
// AG-UI integration to setup the connection.
const honoRuntime = new CopilotRuntime({
  agents: {
    default: new HttpAgent({ url: "http://localhost:8000/" }),
    childAgent: new HttpAgent({ url: "http://localhost:8000/" }),
    pirateAgent: myPirateAgent
  },
  runner: new InMemoryAgentRunner()
});

const app = createCopilotEndpoint({
  runtime: honoRuntime,
  basePath: "/api/copilotkit",
});

export const GET = handle(app);
export const POST = handle(app);