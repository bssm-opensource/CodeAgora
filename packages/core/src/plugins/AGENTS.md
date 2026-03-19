<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-20 | Updated: 2026-03-20 -->

# plugins — Plugin System

## Purpose
Plugin system for CodeAgora enabling extension of review capabilities via custom providers and provider managers. Loads plugins from config, validates them, manages provider registry, and provides builtin providers (OpenAI, Anthropic, Google, Groq, etc.).

## Key Files

| File | Description |
|------|-------------|
| `loader.ts` | Plugin loader: validates and loads plugins from config |
| `registry.ts` | Plugin registry: manages loaded plugins, lookup by name/type |
| `provider-manager.ts` | Provider manager: manages provider instances, factory methods |
| `builtin-providers.ts` | Builtin providers: OpenAI, Anthropic, Google, Groq, OpenRouter |
| `types.ts` | Plugin type definitions: Plugin, PluginType, PluginRegistry |

## Subdirectories
None (plugin utilities)

## For AI Agents

### Working In This Directory

**Key Concepts:**
- **Plugin:** Custom provider implementation loaded from code/file
- **Provider:** LLM API backend (OpenAI, Anthropic, Google, etc.)
- **Plugin Registry:** Map of loaded plugins available for review execution
- **Builtin Providers:** Pre-configured common providers
- **Factory Pattern:** Provider manager creates instances with config

**API Entry Point:**
- `loadPlugins()` — load plugins from config
- `createProviderManager()` — initialize provider registry
- `getProvider()` — lookup provider by name
- `listProviders()` — list all available providers

**Plugin Structure:**
```typescript
interface Plugin {
  name: string;
  type: 'provider' | 'rule' | 'extension';
  init: (config: any) => Promise<Provider>;
}
```

### Testing Requirements

**Plugin Loader:**
- Valid plugin object loads successfully
- Invalid plugin missing required fields → error
- Plugin with broken init → error with details
- Multiple plugins with same name → last wins (or error config)

**Provider Registry:**
- Builtin providers registered automatically
- Custom plugins add to registry
- Lookup by name returns correct provider
- Missing provider → error or fallback

**Builtin Providers:**
- OpenAI: models GPT-4, GPT-3.5, etc.
- Anthropic: models Claude 3 Opus, Sonnet, Haiku
- Google: Gemini models
- Groq: GroqCloud models
- OpenRouter: multi-model aggregator
- All with correct API endpoints and auth

**Provider Manager:**
- Creates provider instances with config
- Manages credentials per provider
- Reuses instances (no recreation per call)
- Handles missing credentials gracefully

**Integration:**
- Load plugins from config
- Provider manager initialized with all plugins
- L0/L1 access providers for model selection and execution

### Common Patterns

**Plugin Loading Flow:**
1. Extract plugins from config
2. For each plugin: validate schema
3. Call plugin.init(config) to get Provider
4. Add to registry
5. Return registry for pipeline use

**Provider Registry:**
```typescript
const registry = new Map<string, Provider>();
registry.set('openai', openaiProvider);
registry.set('anthropic', anthropicProvider);
registry.set('custom', customPlugin);
```

**Custom Provider Creation:**
```typescript
const plugin: Plugin = {
  name: 'custom-provider',
  type: 'provider',
  init: async (config) => ({
    call: async (model, messages) => { ... },
    models: ['custom-model-1', 'custom-model-2'],
  }),
};
```

**Provider Selection in L0:**
- Config specifies provider + model
- ProviderManager looks up provider from registry
- Uses provider's LLM implementation
- Falls back to builtin if custom not found

**Credential Injection:**
- Providers receive credentials via config
- Credentials loaded from ~/.config/codeagora/credentials
- Environment variables used as fallback
- No secrets logged or stored in state

## Dependencies

### Internal (Core)
- `types/config.ts` — plugin config definitions
- `@codeagora/shared` — logger, utils

### External
- `ai` (Vercel AI SDK) — for provider implementations
- `@ai-sdk/*` — provider-specific SDKs (openai, anthropic, google, etc.)

<!-- MANUAL: -->
