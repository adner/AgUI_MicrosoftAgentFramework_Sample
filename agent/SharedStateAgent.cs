using System.Diagnostics.CodeAnalysis;
using System.Runtime.CompilerServices;
using System.Text.Json;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;

[SuppressMessage("Performance", "CA1812:Avoid uninstantiated internal classes", Justification = "Instantiated by ProverbsAgentFactory")]
internal sealed class SharedStateAgent : DelegatingAIAgent
{
    private readonly JsonSerializerOptions _jsonSerializerOptions;

    public SharedStateAgent(AIAgent innerAgent, JsonSerializerOptions jsonSerializerOptions)
        : base(innerAgent)
    {
        _jsonSerializerOptions = jsonSerializerOptions;
    }

    public override Task<AgentRunResponse> RunAsync(IEnumerable<ChatMessage> messages, AgentThread? thread = null, AgentRunOptions? options = null, CancellationToken cancellationToken = default)
    {
        return RunStreamingAsync(messages, thread, options, cancellationToken).ToAgentRunResponseAsync(cancellationToken);
    }

    public override async IAsyncEnumerable<AgentRunResponseUpdate> RunStreamingAsync(
        IEnumerable<ChatMessage> messages,
        AgentThread? thread = null,
        AgentRunOptions? options = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (options is not ChatClientAgentRunOptions { ChatOptions.AdditionalProperties: { } properties } chatRunOptions ||
            !properties.TryGetValue("ag_ui_state", out JsonElement state))
        {
            await foreach (var update in InnerAgent.RunStreamingAsync(messages, thread, options, cancellationToken).ConfigureAwait(false))
            {
                yield return update;
            }
            yield break;
        }

        var chatOptions = new ChatClientAgentRunOptions
        {
            ChatOptions = chatRunOptions.ChatOptions.Clone(),
            AllowBackgroundResponses = chatRunOptions.AllowBackgroundResponses,
            ContinuationToken = chatRunOptions.ContinuationToken,
            ChatClientFactory = chatRunOptions.ChatClientFactory,
        };

        ChatMessage currentStateMessage = new(
            ChatRole.System,
            [
                new TextContent("Here is the current agent state in JSON format:"),
                new TextContent(state.GetRawText())
            ]);

        messages = messages.Prepend(currentStateMessage);

        var allUpdates = new List<AgentRunResponseUpdate>();
        
        await foreach (var update in InnerAgent.RunStreamingAsync(messages, thread, chatOptions, cancellationToken).ConfigureAwait(false))
        {
            if(update.Contents.Any(c => c is TextContent))
            {
                 allUpdates.Add(update);
            }

            yield return update;
        }

        var response = allUpdates.ToAgentRunResponse(); 

        messages = messages.Concat(response.Messages);
        
         // Configure JSON schema response format for structured state output
        chatOptions.ChatOptions.ResponseFormat = ChatResponseFormat.ForJsonSchema<ProverbsStateSnapshot>(
            schemaName: "ProverbsStateSnapshot",
            schemaDescription: "A response containing the current list of proverbs");

        ChatMessage outputNewStateMessage = new(
            ChatRole.System,
            [
                new TextContent("Please output the current agent state in JSON format."),
            ]);

        messages = messages.Append(outputNewStateMessage);
        
        var stateMessageUpdates = new List<AgentRunResponseUpdate>();

        await foreach (var update in InnerAgent.RunStreamingAsync(messages, thread, chatOptions, cancellationToken).ConfigureAwait(false))
        {
            stateMessageUpdates.Add(update);
        }

        var stateMessageResponse = stateMessageUpdates.ToAgentRunResponse(); 

        if (stateMessageResponse.TryDeserialize(_jsonSerializerOptions, out JsonElement stateSnapshot))
        {
            byte[] stateBytes = JsonSerializer.SerializeToUtf8Bytes(
                stateSnapshot,
                _jsonSerializerOptions.GetTypeInfo(typeof(JsonElement)));
            yield return new AgentRunResponseUpdate
            {
                Contents = [new DataContent(stateBytes, "application/json")]
            };
        }
        else
        {
            yield break;
        }
    }
}
