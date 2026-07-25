# AI assistant — providers & future subscriptions

The research agent is built so you can start **free (Ollama)** and add **stronger paid APIs later** without rewriting the app.

## Concepts

| Concept | Purpose |
|--------|---------|
| **Profile** | One LLM endpoint + model + optional API key (e.g. Local Ollama, OpenAI BYOK). |
| **Tier** (`free`, `byok`, `pro`) | What the profile costs — used for entitlements. |
| **Plan** (`free`, `pro`, …) | App subscription (not billing yet) — caps tokens and which tiers are allowed. |

Config lives in Electron store under `agent`:

```json
{
  "enabled": true,
  "activeProfileId": "local-ollama",
  "profiles": [ "...merged with built-ins..." ],
  "subscription": { "plan": "free" }
}
```

Legacy flat fields (`baseUrl`, `model` on root) are migrated automatically on read.

## Built-in profiles

Defined in `electron/providers/agentConfig.js` → `BUILTIN_PROFILES`:

- **local-ollama** — tier `free`, local Ollama
- **openai-byok** — tier `byok`, OpenAI API key
- **groq-byok** — tier `byok`, Groq
- **custom-compatible** — tier `byok`, blank URL for any OpenAI-compatible host

Users can **Add profile** from templates (creates a copy with a new id).

## Runtime path

1. UI → `agent:chat` / `agent:test` (IPC)
2. `agentService` → `resolveActiveRuntime(config)` in `agentConfig.js`
3. `resolveEntitlements(subscription.plan)` → max tokens, allowed tiers, feature flags
4. `LlmClient` → `POST {baseUrl}/chat/completions`

All providers use the **same OpenAI-compatible** chat API surface today.

## Adding a hosted “Pro” subscription later

1. **Billing / license**  
   - After Stripe (or similar), set `agent.subscription.plan` to `pro` (or store `licenseKey` and validate in main process).  
   - Hook: `writeConfig({ subscription: { plan: 'pro', licenseKey: '…' } })`.

2. **Hosted profiles (your keys, user pays you)**  
   - Add built-in profiles with tier `pro`, e.g. `pro-openai-gpt4o`, with `baseUrl` pointing at your proxy.  
   - Inject API key server-side in the proxy — **do not** ship keys in the desktop app.  
   - `allowedTiers` for plan `pro` already includes `pro` in `SUBSCRIPTION_PLANS`.

3. **Entitlements**  
   - Extend `SUBSCRIPTION_PLANS.pro.features` (`streaming`, `tools`, …).  
   - Gate in `resolveActiveRuntime` or before `llm.chat` (e.g. refuse `tools` on free plan).

4. **Optional: refresh subscription from backend**  
   - New IPC `agent:refreshSubscription` that calls your API and updates `subscription` in store.

5. **Streaming**  
   - Add `LlmClient.chatStream()` and UI delta rendering; enable when `features.streaming` is true.

## Files to touch

| File | Role |
|------|------|
| `electron/providers/agentConfig.js` | Profiles, plans, entitlements, migration |
| `electron/providers/agentService.js` | Chat, context enrichment, IPC backing |
| `electron/providers/llmClient.js` | HTTP to LLM |
| `electron/ipc/registerAgent.js` | IPC surface |
| `src/components/Settings.js` | Profile picker & BYOK fields |
| `src/components/AgentPanel.js` | Terminal chat |

## Security

- API keys stay in **electron-store** on the user machine (not in research JSON export).  
- For **Pro hosted** models, prefer a **backend proxy** so keys never ship in the client.
