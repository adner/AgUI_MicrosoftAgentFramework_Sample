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
    You have access to the tool invokeChildAgent that allows you to invoke subagents. After invoking subagents, just respond with 'Successfully invoked subagents'.
    You have access to five child agents, called "childAgent1", through "childAgent5". You will be informed 
    when a child agent completes its task, and the result. Wait until you have received the results of all child agents that have been invoked, before summarizing. 
    Never respond to a question from the user yourself, always delegate to subagents."

  `,
  temperature: 0.7,
});

const childAgentPrompt = `
  You are an autonomous child agent that gets delegated tasks by an orchestrator agent.
  You execute the task as an autonomous operation. Don't ask the user questions.
  When completed, return the result.
`;

const childAgents = [
  new BuiltInAgent({
    model: determineModel(),
    prompt: childAgentPrompt,
    temperature: 0.7,
  }),
  new BuiltInAgent({
    model: determineModel(),
    prompt: childAgentPrompt,
    temperature: 0.7,
  }),
  new BuiltInAgent({
    model: determineModel(),
    prompt: childAgentPrompt,
    temperature: 0.7,
  }),
  new BuiltInAgent({
    model: determineModel(),
    prompt: childAgentPrompt,
    temperature: 0.7,
  }),
  new BuiltInAgent({
    model: determineModel(),
    prompt: childAgentPrompt,
    temperature: 0.7,
  })
];

// 2. Create the CopilotRuntime instance and utilize the Microsoft Agent Framework
// AG-UI integration to setup the connection.
const honoRuntime = new CopilotRuntime({
  agents: {
    default: new HttpAgent({ url: "http://localhost:8000/" }),
    childAgent1: childAgents[0],
    childAgent2: childAgents[1],
    childAgent3: childAgents[2],
    childAgent4: childAgents[3],
    childAgent5: childAgents[4],
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