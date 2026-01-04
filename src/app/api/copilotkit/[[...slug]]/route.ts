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
    You are an agent that orchestrates a number of child agents. The child agents are specialized in working with data from Dataverse, but can be used for other things as well.
    If the user makes a request, delegate the completion of the request to one or many child agents.
    You have access to the tool invokeChildAgent that allows you to invoke subagents. After invoking subagents, just respond with 'Successfully invoked subagents.'.
    You have access to a number of child agents. You will be informed when a child agent completes its task, and the result. When you have received a result from all subagents that were invoked, summarize the result."

  `,
  temperature: 0.7,
});

const childAgentPrompt = `
  You are an autonomous child agent that gets delegated tasks by an orchestrator agent.
  You execute the task as an autonomous operation. Don't ask the user questions.
  When completed, return the result. Don't use markdown.
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

const honoRuntime = new CopilotRuntime({
  agents: {
    childAgent1:  new HttpAgent({ url: "http://localhost:8000/" }),
    childAgent2:  new HttpAgent({ url: "http://localhost:8000/" }),
    childAgent3:  new HttpAgent({ url: "http://localhost:8000/" }),
    childAgent4:  new HttpAgent({ url: "http://localhost:8000/" }),
    childAgent5:  new HttpAgent({ url: "http://localhost:8000/" }),
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