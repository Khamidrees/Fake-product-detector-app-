import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get("image") as File

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Generate a demo response based on image name or random
    const isDemoFake = Math.random() > 0.6 // 40% chance of being fake
    const confidence = Math.floor(Math.random() * 30) + 70 // 70-100% confidence

    const result = {
      prediction: isDemoFake ? "Fake Product" : "Real Product",
      confidence: confidence,
      reasoning: isDemoFake
        ? "The image shows several indicators commonly associated with counterfeit products, including inconsistent logo placement, lower material quality, and manufacturing irregularities."
        : "The product appears to exhibit characteristics consistent with authentic merchandise, including proper branding, quality materials, and professional manufacturing standards.",
      details: {
        visualCues: isDemoFake
          ? ["Inconsistent logo quality", "Poor material finish", "Irregular stitching patterns"]
          : ["High-quality materials", "Consistent branding", "Professional manufacturing"],
        riskFactors: isDemoFake
          ? ["Logo placement inconsistencies", "Material quality concerns", "Manufacturing irregularities"]
          : [],
        authenticity_score: isDemoFake ? 100 - confidence : confidence,
      },
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Demo analysis error:", error)
    return NextResponse.json({ error: "Demo analysis failed" }, { status: 500 })
  }
}
