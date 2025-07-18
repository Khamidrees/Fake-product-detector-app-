"use client"

import type React from "react"

import { useState } from "react"
import { Upload, Camera, AlertCircle, CheckCircle, Loader2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface AnalysisResult {
  prediction: "Real Product" | "Fake Product"
  confidence: number
  reasoning: string
  details: {
    visualCues: string[]
    riskFactors: string[]
    authenticity_score: number
  }
}

export default function FakeProductDetector() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [demoMode, setDemoMode] = useState(false)

  const handleImageSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
      setResult(null)
      setError(null)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageSelect(e.dataTransfer.files[0])
    }
  }

  // Update the analyzeImage function to use demo mode when enabled
  const analyzeImage = async () => {
    if (!selectedImage) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("image", selectedImage)

      const endpoint = demoMode ? "/api/demo-analyze" : "/api/analyze"
      console.log("Using endpoint:", endpoint)

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error occurred" }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const analysisResult: AnalysisResult = await response.json()
      console.log("Analysis result received:", analysisResult.prediction)
      setResult(analysisResult)
    } catch (err) {
      console.error("Analysis error:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze image. Please try again."
      setError(errorMessage)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const downloadReport = () => {
    if (!result || !selectedImage) return

    const reportData = {
      timestamp: new Date().toISOString(),
      filename: selectedImage.name,
      prediction: result.prediction,
      confidence: result.confidence,
      reasoning: result.reasoning,
      details: result.details,
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `product-analysis-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Add this right after the header section, before the main grid
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Fake Product Detector</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-1">by Khalid Muhammad Idris</p>
          <p className="text-gray-500 dark:text-gray-400">Upload a product image to verify its authenticity using AI</p>

          {/* Demo Mode Toggle */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
                className="rounded"
              />
              Demo Mode (works without OpenAI API)
            </label>
          </div>
        </div>

        {/* Rest of the component remains the same */}

        <div className="max-w-4xl mx-auto grid gap-8 md:grid-cols-2">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Upload Product Image
              </CardTitle>
              <CardDescription>Drag and drop an image or click to select</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-600"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {imagePreview ? (
                  <div className="space-y-4">
                    <img
                      src={imagePreview || "/placeholder.svg"}
                      alt="Selected product"
                      className="max-h-64 mx-auto rounded-lg shadow-md"
                    />
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedImage(null)
                          setImagePreview(null)
                          setResult(null)
                        }}
                      >
                        Remove
                      </Button>
                      <Button onClick={analyzeImage} disabled={isAnalyzing} className="bg-blue-600 hover:bg-blue-700">
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          "Analyze Product"
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-gray-400" />
                    <div>
                      <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Drop your image here</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">or click to browse</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleImageSelect(e.target.files[0])
                        }
                      }}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button asChild variant="outline">
                      <label htmlFor="file-upload" className="cursor-pointer">
                        Select Image
                      </label>
                    </Button>
                  </div>
                )}
              </div>

              {error && (
                <Alert className="mt-4" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Analysis Results
              </CardTitle>
              <CardDescription>AI-powered authenticity assessment</CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-6">
                  {/* Main Result */}
                  <div className="text-center p-6 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {result.prediction === "Real Product" ? (
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      ) : (
                        <AlertCircle className="h-8 w-8 text-red-500" />
                      )}
                      <Badge
                        variant={result.prediction === "Real Product" ? "default" : "destructive"}
                        className="text-lg px-4 py-2"
                      >
                        {result.prediction}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold mb-2">{result.confidence}% Confidence</p>
                    <Progress value={result.confidence} className="w-full max-w-xs mx-auto" />
                  </div>

                  {/* Detailed Analysis */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">AI Reasoning:</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        {result.reasoning}
                      </p>
                    </div>

                    {result.details.visualCues.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Visual Cues:</h4>
                        <ul className="text-sm space-y-1">
                          {result.details.visualCues.map((cue, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-blue-500">•</span>
                              {cue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.details.riskFactors.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2 text-red-600">Risk Factors:</h4>
                        <ul className="text-sm space-y-1">
                          {result.details.riskFactors.map((factor, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-red-500">•</span>
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button onClick={downloadReport} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download Report
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Upload and analyze an image to see results</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <Card className="max-w-4xl mx-auto mt-8">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              <div className="text-center">
                <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-semibold mb-2">1. Upload Image</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Upload a clear photo of the product you want to verify
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-100 dark:bg-green-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <Camera className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h4 className="font-semibold mb-2">2. AI Analysis</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Our AI analyzes visual cues, quality markers, and authenticity indicators
                </p>
              </div>
              <div className="text-center">
                <div className="bg-purple-100 dark:bg-purple-900 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="font-semibold mb-2">3. Get Results</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Receive detailed analysis with confidence scores and reasoning
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
