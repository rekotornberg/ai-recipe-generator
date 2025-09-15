// amplify/data/bedrock.js

export function request(ctx) {
  const ingredients = Array.isArray(ctx.args?.ingredients) ? ctx.args.ingredients : [];
  const prompt = `Suggest a recipe idea using these ingredients: ${ingredients.join(", ")}.`;

  return {
    resourcePath: `/model/anthropic.claude-3-sonnet-20240229-v1:0/invoke`,
    method: "POST",
    params: {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // Bedrock/Anthropic versio headeriin
        "anthropic-version": "bedrock-2023-05-31",
      },
      // ⛳ TÄRKEIN MUUTOS: body on OBJEKTI, EI JSON-string
      body: {
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            // Bedrock hyväksyy stringin contentiksi; array-of-blocks toimii myös
            content: prompt,
          },
        ],
      },
    },
  };
}

export function response(ctx) {
  try {
    const statusCode = ctx?.result?.statusCode ?? 200;
    const raw = ctx?.result?.body ?? "";

    // body voi olla string tai objekti → normalisoidaan
    let parsed = {};
    if (typeof raw === "string" && raw.trim()) {
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        // Palauta raakateksti virheenä, jos ei ole JSON
        return { body: "", error: `Non-JSON response: ${String(raw)}` };
      }
    } else if (raw && typeof raw === "object") {
      parsed = raw;
    }

    if (statusCode >= 400) {
      const msg =
        parsed?.message ??
        parsed?.error?.message ??
        (Array.isArray(parsed?.errors)
          ? parsed.errors.map((e) => e?.message).filter(Boolean).join("\n")
          : undefined) ??
        (typeof raw === "string" ? raw : "") ??
        `Bedrock error ${statusCode}`;
      return { body: "", error: String(msg) };
    }

    // Nosta teksti turvallisesti ilman [0]-indeksointia
    let text = "";

    // Bedrock/Anthropic Messages API: vastaus-objekti sisältää usein "content"
    // joka on taulukko tekstiblokkeja TAI suora merkkijono "output_text"
    const content = parsed?.content;
    if (Array.isArray(content)) {
      const firstText = content.find((c) => typeof c?.text === "string");
      if (firstText?.text) text = firstText.text;
    }

    if (!text && typeof parsed?.output_text === "string") text = parsed.output_text;
    if (!text && typeof parsed?.completion === "string") text = parsed.completion;
    if (!text && typeof parsed?.result === "string") text = parsed.result;

    // Viimeinen fallback: palauta koko JSON stringinä
    if (!text) {
      return { body: JSON.stringify(parsed, null, 2), error: "" };
    }

    return { body: text, error: "" };
  } catch (e) {
    return { body: "", error: `Handler error: ${String(e?.message || e)}` };
  }
}
