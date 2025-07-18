import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// Validate environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set in environment variables")
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
})

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key is missing")
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Please add OPENAI_API_KEY to your environment variables." },
        { status: 500 },
      )
    }

    const formData = await request.formData()
    const image = formData.get("image") as File

    if (!image) {
      console.error("No image provided in request")
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    console.log("Processing image:", image.name, "Size:", image.size, "Type:", image.type)

    // Validate image size (max 20MB)
    if (image.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large. Please use an image smaller than 20MB." }, { status: 400 })
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString("base64")

    console.log("Image converted to base64, length:", base64Image.length)

    // Analyze image with OpenAI Vision
    console.log("Calling OpenAI API...")
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an expert product authenticity detector. Analyze this product image and determine if it appears to be a genuine/authentic product or a fake/counterfeit product.

Please provide your analysis in the following JSON format:
{
  "prediction": "Real Product" or "Fake Product",
  "confidence": number between 0-100,
  "reasoning": "detailed explanation of your assessment",
  "details": {
    "visualCues": ["list of visual indicators you observed"],
    "riskFactors": ["list of concerning elements if any"],
    "authenticity_score": number between 0-100
  }
}

Look for indicators such as:
- Build quality and materials
- Logo placement and quality
- Text clarity and font consistency
- Overall craftsmanship
- Packaging quality (if visible)
- Price-to-quality ratio indicators
- Common counterfeit telltale signs

Be thorough but concise in your analysis.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/${image.type.split("/")[1]};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    })

    console.log("OpenAI API response received")

    const analysisText = response.choices[0]?.message?.content

    if (!analysisText) {
      console.error("No analysis content received from OpenAI")
      throw new Error("No analysis received from AI")
    }

    console.log("Analysis text:", analysisText.substring(0, 200) + "...")

    // Parse the JSON response
    let analysisResult
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0])
        console.log("Successfully parsed JSON response")
      } else {
        console.log("No JSON found in response, creating fallback")
        throw new Error("No JSON found in response")
      }
    } catch (parseError) {
      console.log("JSON parsing failed, creating fallback response")
      // Fallback if JSON parsing fails
      const isFake =
        analysisText.toLowerCase().includes("fake") ||
        analysisText.toLowerCase().includes("counterfeit") ||
        analysisText.toLowerCase().includes("replica")

      analysisResult = {
        prediction: isFake ? "Fake Product" : "Real Product",
        confidence: 75,
        reasoning: analysisText,
        details: {
          visualCues: ["AI analysis completed - detailed JSON parsing unavailable"],
          riskFactors: isFake ? ["Potential authenticity concerns detected"] : [],
          authenticity_score: isFake ? 25 : 75,
        },
      }
    }

    // Ensure the response has the correct structure
    const result = {
      prediction: analysisResult.prediction === "Fake Product" ? "Fake Product" : "Real Product",
      confidence: Math.min(100, Math.max(0, analysisResult.confidence || 50)),
      reasoning: analysisResult.reasoning || "Analysis completed successfully",
      details: {
        visualCues: Array.isArray(analysisResult.details?.visualCues)
          ? analysisResult.details.visualCues
          : ["Visual analysis performed"],
        riskFactors: Array.isArray(analysisResult.details?.riskFactors) ? analysisResult.details.riskFactors : [],
        authenticity_score: analysisResult.details?.authenticity_score || analysisResult.confidence || 50,
      },
    }

    console.log("Returning result:", result.prediction, "with", result.confidence + "% confidence")
    return NextResponse.json(result)
  } catch (error) {
    console.error("Analysis error details:", error)

    // Provide more specific error messages
    let errorMessage = "Failed to analyze image"
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        errorMessage = "OpenAI API key is invalid or missing"
        statusCode = 401
      } else if (error.message.includes("quota")) {
        errorMessage = "OpenAI API quota exceeded"
        statusCode = 429
      } else if (error.message.includes("rate limit")) {
        errorMessage = "Rate limit exceeded. Please try again later."
        statusCode = 429
      } else {
        errorMessage = `Analysis failed: ${error.message}`
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode })
  }
}
