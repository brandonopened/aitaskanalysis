import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI();

export async function analyzeTaskAIPotential(description: string): Promise<{
  potential: "none" | "some" | "advanced";
  coachingTips: string;
  motivationalScore: number;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert AI productivity coach. Analyze the task and provide: 1) AI automation potential ('none', 'some', or 'advanced'), 2) personalized coaching tips to help the user approach the task effectively, and 3) a motivation score (1-100) based on task complexity and impact. Respond in JSON format with 'potential', 'coachingTips', and 'motivationalScore' fields. Make the coaching tips encouraging and actionable, focusing on both personal growth and efficiency.",
        },
        {
          role: "user",
          content: `Please analyze this task and provide coaching insights: "${description}"`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Invalid response from OpenAI");
    }

    const result = JSON.parse(content);
    if (!result.potential || !["none", "some", "advanced"].includes(result.potential)) {
      throw new Error("Invalid potential value in response");
    }

    if (typeof result.motivationalScore !== 'number' || result.motivationalScore < 1 || result.motivationalScore > 100) {
      throw new Error("Invalid motivational score in response");
    }

    return {
      potential: result.potential as "none" | "some" | "advanced",
      coachingTips: result.coachingTips || "No coaching tips available.",
      motivationalScore: result.motivationalScore,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to analyze task with AI");
  }
}

export async function estimateTaskTime(description: string): Promise<{manual: number, withAI: number | null}> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at estimating task completion times. For the given task, provide two estimates: 1) how many minutes it would take an average person to complete manually, and 2) how many minutes it would take with AI assistance (if applicable). Respond with JSON containing 'manualMinutes' and 'aiAssistedMinutes' fields. If AI cannot help with the task, set aiAssistedMinutes to null. Consider task complexity, required focus, and typical execution time. Round to the nearest 5 minutes.",
        },
        {
          role: "user",
          content: `Please estimate completion times for this task and respond with JSON: "${description}"`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Invalid response from OpenAI");
    }

    const result = JSON.parse(content);
    if (typeof result.manualMinutes !== 'number') {
      throw new Error("Invalid manual minutes in response");
    }

    return {
      manual: result.manualMinutes,
      withAI: typeof result.aiAssistedMinutes === 'number' ? result.aiAssistedMinutes : null
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to estimate task time with AI");
  }
}

export async function getAIImplementationDetails(description: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI implementation expert. For the given task, provide detailed suggestions on how to incorporate AI tools and techniques to save time. Focus on practical, actionable steps using currently available AI technologies. Include specific tools, APIs, or services when relevant. Structure your response with clear steps and expected benefits.",
        },
        {
          role: "user",
          content: `Please suggest specific AI tools and techniques to optimize this task: "${description}"`,
        },
      ],
    });

    return response.choices[0]?.message?.content || "No implementation details available.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to get AI implementation details");
  }
}