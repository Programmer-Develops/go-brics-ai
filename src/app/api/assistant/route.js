import { NextResponse } from "next/server";
import { GOBRICS_CATALOGUE } from "../../../lib/catalogue"; // Import the data file!

const GOBRICS_CONTEXT = `
You are the GO-BRICS Business Lab AI Assistant. You assist participants in Cohort I.
Key Information:
- Tracks: Track A (Sales - B2B outreach), Track B (Projects - Tech, Content, Ops).
- Products/SKUs: SKU-01 (Kavach Shield OM - 48 GBP), SKU-02 (Vastu Dosh Pyramid - 80 GBP), SKU-03 (Amrit Jal Shuddhi Set - 55 GBP), SKU-04 (Rudra-Shila Raksha Mala - 33 GBP), SKU-05 (Shila Raksha Pendant OM - 40 GBP).
- GBP (GO-BRICS Points) is the weighting mechanism for team income.

Here is the COMPLETE and OFFICIAL task list you MUST reference for ALL recommendations:
${GOBRICS_CATALOGUE}

Maintain a professional, operational, and highly practical tone. Format outputs clearly using Markdown.
If asked to recommend tasks, ONLY recommend real tasks from the catalogue provided above. Ensure you cite the correct Task ID and GBP value.
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
      2. Cold Email (Subject line, hook, CTA)
      3. WhatsApp Business (Conversational, direct)`;
    } 
    else if (action === "content") {
      prompt = `Write content for Task C02/C04. Product: ${payload.product}. Content Type: ${payload.type}.
      If Product Description: Include headline, body, bullets, and CTA.
      If Social Media: Write 3 posts with visual ideas and hashtags.
      If Blog Outline: Provide Title, SEO Keyword, and 4 detailed section headers.`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: GOBRICS_CONTEXT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4 } // Kept low to ensure strict adherence to the data file
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