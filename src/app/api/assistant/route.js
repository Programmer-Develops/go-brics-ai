import { NextResponse } from "next/server";
import { GOBRICS_CATALOGUE, ADISHILA_CATALOGUE } from "../../../lib/catalogue";

const GOBRICS_CONTEXT = `
You are the GO-BRICS Business Lab AI Assistant. You assist participants in Cohort I.

Here is the COMPLETE GO-BRICS task list you MUST reference for ALL recommendations:
${GOBRICS_CATALOGUE}

Here is the OFFICIAL AdiShila product catalog and B2B terms you MUST reference when generating sales scripts or content briefs:
${ADISHILA_CATALOGUE}

Maintain a professional, operational, and highly practical tone. Format outputs clearly using Markdown.
- If asked to recommend tasks, ONLY recommend real tasks from the GO-BRICS task list. 
- If asked to write sales scripts or content, heavily utilize the specific product dimensions, materials, MOQ, shipping rules, and wholesale margins from the AdiShila catalog to make it hyper-realistic and accurate. Do not hallucinate product features.
`;

export async function POST(request) {
  try {
    const { action, payload } = await request.json();
    const apiKey = process.env.GOOGLE_API_KEY;
    const model = "gemini-3.1-flash-lite";

    if (!apiKey) return NextResponse.json({ error: "Missing API Key" }, { status: 500 });

    let prompt = "";

    if (action === "recommender") {
      prompt = `Based on the GO-BRICS catalogue, recommend exactly 3 specific tasks for a participant in Track ${payload.track}. 
      Their skills: ${payload.skills || 'General'}. Available Time: ${payload.hours} hours.
      Include the exact Task ID, Name, estimated GBP, and a 1-sentence tip on how to execute it efficiently.`;
    } 
    else if (action === "sales") {
      prompt = `Write B2B cold outreach scripts for Task S02. Product: ${payload.product}. Target Persona: ${payload.persona}.
      Generate exactly 3 distinct scripts:
      1. LinkedIn DM (Short, connection-focused)
      2. Cold Email (Subject line, hook, CTA. Incorporate exact pricing, MOQ, or margin data if relevant to a B2B buyer)
      3. WhatsApp Business (Conversational, direct, mention shipping or marketing support if applicable)`;
    } 
    else if (action === "content") {
      prompt = `Write content for Task C02/C04. Product: ${payload.product}. Content Type: ${payload.type}.
      If Product Description: Include headline, 150-250 word body, bullet points citing exact dimensions/materials, and CTA.
      If Social Media: Write 3 posts with visual ideas and hashtags.
      If Blog Outline: Provide Title, SEO Keyword, and 4 detailed section headers based on the product's actual properties (e.g., C60, Karelia origin).`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: GOBRICS_CONTEXT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4 } 
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: "API Error", details: errorText }, { status: response.status });
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error generating output.";
    
    return NextResponse.json({ result: answer });

  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}