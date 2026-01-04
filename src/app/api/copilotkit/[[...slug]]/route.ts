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

const myOrchestratorAgent = new BuiltInAgent({
  model: determineModel(),
  prompt: `
    You are an agent that orchestrates a number of child agents.
    If the user makes a request, delegate the completion of the request to one or many subagents.
    You have access to the tool spawnChildagents that allows you to spawn subagents. After spawning subagents, just respond with 'Successfully spawned subagents'.
    You have access to three childagents, called "childAgent1", "childAgent2" and "childAgent3". You can spawn at most three childagents at once.
  `,
  temperature: 0.7,
});

// 2. Create the CopilotRuntime instance and utilize the Microsoft Agent Framework
// AG-UI integration to setup the connection.
const honoRuntime = new CopilotRuntime({
  agents: {
    default: new HttpAgent({ url: "http://localhost:8000/" }),
    childAgent1: new HttpAgent({ url: "http://localhost:8000/" }),
    childAgent2: new HttpAgent({ url: "http://localhost:8000/" }),
    childAgent3: new HttpAgent({ url: "http://localhost:8000/" }),
    orchestratorAgent: myOrchestratorAgent
  },
  runner: new InMemoryAgentRunner()
});

const app = createCopilotEndpoint({
  runtime: honoRuntime,
  basePath: "/api/copilotkit",
});

export const GET = handle(app);
export const POST = handle(app);