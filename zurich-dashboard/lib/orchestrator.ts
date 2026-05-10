import Anthropic from "@anthropic-ai/sdk";
import { searchPlaces, RawPlace } from "./places";
import { Business } from "./types";

// ── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_zurich_businesses",
    description:
      "Search for businesses in Zurich using the Google Places API. Returns only businesses that do NOT have a website. Call this multiple times with different search queries to cover different business categories.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            'Search query, e.g. "restaurants Zurich", "hair salons Zurich", "plumbers Zurich Switzerland"',
        },
      },
      required: ["query"],
    },
  },
  {
    name: "generate_lovable_prompt",
    description:
      "Generate a tailored Lovable (website builder) prompt for a specific business. Call this once per business that needs a website.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Business name" },
        category: { type: "string", description: "Business category / type" },
        address: { type: "string", description: "Full address" },
        phone: { type: "string", description: "Phone number, or empty string" },
      },
      required: ["name", "category", "address", "phone"],
    },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapPlace(p: RawPlace): Omit<Business, "lovablePrompt"> {
  return {
    placeId: p.id,
    name: p.displayName.text,
    category: p.primaryTypeDisplayName?.text ?? "Business",
    address: p.formattedAddress,
    phone: p.nationalPhoneNumber ?? "",
    hasWebsite: false,
  };
}

async function callGeneratePrompt(
  anthropic: Anthropic,
  input: { name: string; category: string; address: string; phone: string }
): Promise<string> {
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a website brief writer. Generate a clear, actionable prompt for the AI website builder Lovable to create a professional website for this business.

Business name: ${input.name}
Category: ${input.category}
Address: ${input.address}
Phone: ${input.phone || "not listed"}

Requirements for the prompt:
- 150–200 words
- Specify visual style fitting the category (e.g. warm for restaurants, clinical for medical, modern for tech)
- List key pages: Home, About, Services/Menu, Contact
- Embed the real business name, address, and phone number
- Include a call-to-action (e.g. "Book now", "Order online", "Request a quote")
- Ask for mobile-first responsive design

Output only the prompt text — no preamble, no quotes.`,
      },
    ],
  });

  const block = msg.content[0];
  return block.type === "text" ? block.text.trim() : "";
}

// ── Main orchestrator ────────────────────────────────────────────────────────

export async function runOrchestrator(
  googleApiKey: string,
  onStatus: (msg: string) => void,
  onBusiness: (b: Business) => void
): Promise<number> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const seenIds = new Set<string>();
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `You are a research agent. Your goal: find businesses in Zurich, Switzerland that do NOT have a website, then generate a Lovable website prompt for each one.

Instructions:
1. Call search_zurich_businesses with at least 8 different queries covering diverse categories (restaurants, cafes, shops, hair salons, gyms, plumbers, dentists, hotels, bakeries, boutiques, etc.)
2. After each search, review the results — deduplicate by name if needed.
3. For EVERY business returned, call generate_lovable_prompt to create a website prompt.
4. Aim for at least 20 unique businesses total across all searches.
5. When done, say "DONE".`,
    },
  ];

  let totalBusinesses = 0;

  // Agentic loop
  while (true) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools: TOOLS,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") break;

    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        if (block.name === "search_zurich_businesses") {
          const { query } = block.input as { query: string };
          onStatus(`Searching: "${query}"…`);

          let places: RawPlace[] = [];
          try {
            places = await searchPlaces(query, googleApiKey);
          } catch (err) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: `Error: ${String(err)}`,
            });
            continue;
          }

          const noWebsite = places.filter((p) => !p.websiteUri);
          const newOnes = noWebsite.filter((p) => !seenIds.has(p.id));
          newOnes.forEach((p) => seenIds.add(p.id));

          onStatus(
            `"${query}" → ${places.length} results, ${noWebsite.length} without website (${newOnes.length} new)`
          );

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(
              newOnes.map((p) => ({
                id: p.id,
                name: p.displayName.text,
                category: p.primaryTypeDisplayName?.text ?? "Business",
                address: p.formattedAddress,
                phone: p.nationalPhoneNumber ?? "",
              }))
            ),
          });
        }

        if (block.name === "generate_lovable_prompt") {
          const input = block.input as {
            name: string;
            category: string;
            address: string;
            phone: string;
          };
          onStatus(`Generating prompt for ${input.name}…`);

          let prompt = "";
          try {
            prompt = await callGeneratePrompt(anthropic, input);
          } catch (err) {
            prompt = `Could not generate prompt: ${String(err)}`;
          }

          const business: Business = {
            placeId: `gen-${input.name}`,
            name: input.name,
            category: input.category,
            address: input.address,
            phone: input.phone,
            hasWebsite: false,
            lovablePrompt: prompt,
          };

          onBusiness(business);
          totalBusinesses++;

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Prompt generated for ${input.name}.`,
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
    }
  }

  return totalBusinesses;
}
