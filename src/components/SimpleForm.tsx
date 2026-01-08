"use client";

import { useState } from "react";
import { useAgent } from "@copilotkit/react-core/v2";

export function SimpleForm() {
  const [inputValue, setInputValue] = useState("");

  const { agent } = useAgent({ agentId: "orchestratorAgent" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitted:", inputValue);
    setInputValue("");

    agent.addMessage({ id: crypto.randomUUID(), role: "user", content: inputValue });

    const result = await agent.runAgent();
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4">
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="border rounded px-3 py-2 flex-1"
        placeholder="Enter text..."
      />
      <button
        type="submit"
        className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
      >
        Submit
      </button>
    </form>
  );
}
