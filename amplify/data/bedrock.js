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
      },
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }],
          },
        ],
      }),
    },
  };
}

export function response(ctx) {
  try {
    const statusCode = ctx?.result?.statusCode ?? 200;
    const raw = ctx?.result?.body ?? "";
    let parsed = {};

    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch (e) {
      // Jos vastaus ei ole JSON, palautetaan raakateksti virheenä
      return { body: "", error: `Non-JSON response: ${String(raw)}` };
    }

    if (statusCode >= 400) {
      const msg =
        (parsed?.message ??
        parsed?.error?.message ??
        parsed?.errors?.map?.(e => e?.message)?.join?.("\n") ??
        raw) ||
        `Bedrock error ${statusCode}`;
      return { body: "", error: String(msg) };
    }

    // Turvallinen tekstin nosto eri muodoista – ilman [0]-indeksejä
    let text = "";

    // Anthropic Messages API: content: [{type:"text", text:"..."}]
    const contentArr = Array.isArray(parsed?.content) ? parsed.content : [];
    const firstTextObj = contentArr.find?.(c => typeof c?.text === "string");
    if (firstTextObj?.text) text = firstTextObj.text;

    // Fallbackeja muihin mahdollisiin muotoihin
    if (!text && typeof parsed?.output_text === "string") text = parsed.output_text;
    if (!text && typeof parsed?.completion === "string") text = parsed.completion;
    if (!text && typeof parsed?.result === "string") text = parsed.result;

    // Viimeinen fallback: palauta koko JSON
    if (!text) {
      return { body: JSON.stringify(parsed, null, 2), error: "" };
    }

    return { body: text, error: "" };
  } catch (e) {
    return { body: "", error: `Handler error: ${String(e?.message || e)}` };
  }
}
