using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Hosting.AGUI.AspNetCore;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Options;
using OpenAI;
using System.ComponentModel;
using System.Text.Json.Serialization;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.PowerPlatform.Dataverse.Client;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<IOrganizationService>(provider =>
{
    var configuration = provider.GetRequiredService<IConfiguration>();
    string url = configuration["Url"] ?? throw new InvalidOperationException("Url not found in configuration");
    string clientId = configuration["ClientId"] ?? throw new InvalidOperationException("ClientId not found in configuration");
    string clientSecret = configuration["ClientSecret"] ?? throw new InvalidOperationException("ClientSecret not found in configuration");

    string connectionString = $@"
    AuthType = ClientSecret;
    Url = {url};
    ClientId = {clientId};
    Secret = {clientSecret}";

    return new ServiceClient(connectionString);
});

builder.Services.ConfigureHttpJsonOptions(options => options.SerializerOptions.TypeInfoResolverChain.Add(ProverbsAgentSerializerContext.Default));
builder.Services.AddAGUI();

WebApplication app = builder.Build();

// Create the agent factory and map the AG-UI agent endpoint
var loggerFactory = app.Services.GetRequiredService<ILoggerFactory>();
var jsonOptions = app.Services.GetRequiredService<IOptions<JsonOptions>>();
var orgService = app.Services.GetRequiredService<IOrganizationService>();
var agentFactory = new ProverbsAgentFactory(builder.Configuration, loggerFactory, jsonOptions.Value.SerializerOptions, orgService);
app.MapAGUI("/", agentFactory.CreateProverbsAgent());

await app.RunAsync();

// =================
// State Management
// =================
public class ProverbsState
{
    public List<string> Proverbs { get; set; } = [];
}

// =================
// Agent Factory
// =================
public class ProverbsAgentFactory
{
    private readonly IConfiguration _configuration;
    private readonly ProverbsState _state;
    private readonly OpenAIClient _openAiClient;
    private readonly ILogger _logger;
    private readonly System.Text.Json.JsonSerializerOptions _jsonSerializerOptions;
    private readonly IOrganizationService _orgService;

    public ProverbsAgentFactory(IConfiguration configuration, ILoggerFactory loggerFactory, System.Text.Json.JsonSerializerOptions jsonSerializerOptions, IOrganizationService orgService)
    {
        _configuration = configuration;
        _state = new();
        _logger = loggerFactory.CreateLogger<ProverbsAgentFactory>();
        _jsonSerializerOptions = jsonSerializerOptions;
        _orgService = orgService;

        var apiKey = configuration["OpenAi_ApiKey"] ?? throw new InvalidOperationException("OpenAi_ApiKey not found in configuration");

        _openAiClient = new(apiKey);
    }

    public AIAgent CreateProverbsAgent()
    {
        var chatClient = _openAiClient.GetChatClient("gpt-5.2").AsIChatClient();

        var chatClientAgent = new ChatClientAgent(
            chatClient,
            instructions: @"You are an agent that helps the user retrieve data from Dataverse. Don't use markdown in your responses. Don't cite the FetchXml that was used in your queries, answer using natural language and be brief.",
            name: "DataverseAgent",
            tools: [
                // AIFunctionFactory.Create(GetProverbs, options: new() { Name = "get_proverbs", SerializerOptions = _jsonSerializerOptions }),
                // AIFunctionFactory.Create(AddProverbs, options: new() { Name = "add_proverbs", SerializerOptions = _jsonSerializerOptions }),
                // AIFunctionFactory.Create(SetProverbs, options: new() { Name = "set_proverbs", SerializerOptions = _jsonSerializerOptions }),
                // AIFunctionFactory.Create(GetWeather, options: new() { Name = "get_weather", SerializerOptions = _jsonSerializerOptions })
                AIFunctionFactory.Create(ExecuteFetch)
            ]);

        return new SharedStateAgent(chatClientAgent, _jsonSerializerOptions);
    }

    // =================
    // Tools
    // =================

    [Description("Executes an FetchXML request using the supplied expression that needs to be a valid FetchXml expression. Returns the result as a JSON string. If the request fails, the response will be prepended with [ERROR] and the error should be presented to the user.")]
    private string ExecuteFetch(string fetchXmlRequest)
    {
        try
        {
            FetchExpression fetchExpression = new FetchExpression(fetchXmlRequest);
            EntityCollection result = _orgService.RetrieveMultiple(fetchExpression);

            return Newtonsoft.Json.JsonConvert.SerializeObject(result);
        }
        catch (Exception err)
        {
            var errorString = "[ERROR] " + err.ToString();
            Console.Error.WriteLine(err.ToString());

            return errorString;
        }
    }

    [Description("Get the current list of proverbs.")]
    private List<string> GetProverbs()
    {
        _logger.LogInformation("📖 Getting proverbs: {Proverbs}", string.Join(", ", _state.Proverbs));
        return _state.Proverbs;
    }

    [Description("Add new proverbs to the list.")]
    private void AddProverbs([Description("The proverbs to add")] List<string> proverbs)
    {
        _logger.LogInformation("➕ Adding proverbs: {Proverbs}", string.Join(", ", proverbs));
        _state.Proverbs.AddRange(proverbs);
    }

    [Description("Replace the entire list of proverbs.")]
    private void SetProverbs([Description("The new list of proverbs")] List<string> proverbs)
    {
        _logger.LogInformation("📝 Setting proverbs: {Proverbs}", string.Join(", ", proverbs));
        _state.Proverbs = [.. proverbs];
    }

    [Description("Get the weather for a given location. Ensure location is fully spelled out.")]
    private WeatherInfo GetWeather([Description("The location to get the weather for")] string location)
    {
        _logger.LogInformation("🌤️  Getting weather for: {Location}", location);
        return new()
        {
            Temperature = 20,
            Conditions = "sunny",
            Humidity = 50,
            WindSpeed = 10,
            FeelsLike = 25
        };
    }
}

// =================
// Data Models
// =================

public class ProverbsStateSnapshot
{
    [JsonPropertyName("proverbs")]
    public List<string> Proverbs { get; set; } = [];
}

public class WeatherInfo
{
    [JsonPropertyName("temperature")]
    public int Temperature { get; init; }

    [JsonPropertyName("conditions")]
    public string Conditions { get; init; } = string.Empty;

    [JsonPropertyName("humidity")]
    public int Humidity { get; init; }

    [JsonPropertyName("wind_speed")]
    public int WindSpeed { get; init; }

    [JsonPropertyName("feelsLike")]
    public int FeelsLike { get; init; }
}

public partial class Program { }

// =================
// Serializer Context
// =================
[JsonSerializable(typeof(ProverbsStateSnapshot))]
[JsonSerializable(typeof(WeatherInfo))]
internal sealed partial class ProverbsAgentSerializerContext : JsonSerializerContext;
