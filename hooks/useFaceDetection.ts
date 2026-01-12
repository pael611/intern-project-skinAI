"use client"
import { useRef, useCallback, useState, useEffect } from "react"

// Type definitions for MediaPipe Face Detection
interface Detection {
  boundingBox: {
    xCenter: number
    yCenter: number
    width: number
    height: number
  }
  landmarks?: Array<{ x: number; y: number }>
}

interface FaceDetectionResults {
  detections: Detection[]
}

interface FaceDetectionConfig {
  locateFile?: (file: string) => string
}

interface FaceDetectionInstance {
  setOptions: (options: {
    selfieMode?: boolean
    model?: string
    minDetectionConfidence?: number
  }) => void
  onResults: (callback: (results: FaceDetectionResults) => void) => void
  send: (data: { image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement }) => Promise<void>
  close: () => void
}

declare global {
  interface Window {
    FaceDetection?: new (config: FaceDetectionConfig) => FaceDetectionInstance
  }
}

export type FaceDetectionStatus = "idle" | "loading" | "ready" | "detecting" | "face-detected" | "no-face" | "error"

export interface FaceBox {
  x: number
  y: number
  width: number
  height: number
}

export interface UseFaceDetectionReturn {
  status: FaceDetectionStatus
  faceBox: FaceBox | null
  faceCount: number
  error: string | null
  isReady: boolean
  detectFromVideo: (video: HTMLVideoElement) => Promise<boolean>
  detectFromImage: (image: HTMLImageElement | HTMLCanvasElement) => Promise<boolean>
  drawFaceBox: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    color?: string
  ) => void
  startContinuousDetection: (video: HTMLVideoElement, onDetection?: (hasFace: boolean) => void) => void
  stopContinuousDetection: () => void
}

export function useFaceDetection(): UseFaceDetectionReturn {
  const [status, setStatus] = useState<FaceDetectionStatus>("idle")
  const [faceBox, setFaceBox] = useState<FaceBox | null>(null)
  const [faceCount, setFaceCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const faceDetectionRef = useRef<FaceDetectionInstance | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const isDetectingRef = useRef(false)
  const continuousDetectionRef = useRef(false)

  // Load MediaPipe Face Detection from CDN
  const loadFaceDetection = useCallback(async (): Promise<FaceDetectionInstance> => {
    if (faceDetectionRef.current) {
      return faceDetectionRef.current
    }

    setStatus("loading")

    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.FaceDetection) {
        const detector = new window.FaceDetection({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
        })
        
        detector.setOptions({
          selfieMode: false,
          model: "short", // 'short' for close-range, 'full' for far-range
          minDetectionConfidence: 0.5,
        })

        faceDetectionRef.current = detector
        setStatus("ready")
        resolve(detector)
        return
      }

      // Load script from CDN
      const script = document.createElement("script")
      script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js"
      script.async = true
      script.crossOrigin = "anonymous"

      script.onload = () => {
        // Wait a bit for the global to be available
        setTimeout(() => {
          if (window.FaceDetection) {
            const detector = new window.FaceDetection({
              locateFile: (file: string) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
            })

            detector.setOptions({
              selfieMode: false,
              model: "short",
              minDetectionConfidence: 0.5,
            })

            faceDetectionRef.current = detector
            setStatus("ready")
            resolve(detector)
          } else {
            setError("MediaPipe Face Detection tidak tersedia")
            setStatus("error")
            reject(new Error("FaceDetection not available"))
          }
        }, 100)
      }

      script.onerror = () => {
        setError("Gagal memuat MediaPipe Face Detection")
        setStatus("error")
        reject(new Error("Failed to load MediaPipe Face Detection"))
      }

      document.head.appendChild(script)
    })
  }, [])

  // Process detection results
  const processResults = useCallback((results: FaceDetectionResults): boolean => {
    const detections = results.detections || []
    setFaceCount(detections.length)

    if (detections.length > 0) {
      const detection = detections[0]
      const box = detection.boundingBox

      // Convert normalized coordinates to pixel coordinates
      setFaceBox({
        x: box.xCenter - box.width / 2,
        y: box.yCenter - box.height / 2,
        width: box.width,
        height: box.height,
      })
      setStatus("face-detected")
      return true
    } else {
      setFaceBox(null)
      setStatus("no-face")
      return false
    }
  }, [])

  // Detect face from video element
  const detectFromVideo = useCallback(
    async (video: HTMLVideoElement): Promise<boolean> => {
      if (isDetectingRef.current) return false

      try {
        isDetectingRef.current = true
        setStatus("detecting")

        const detector = await loadFaceDetection()

        return new Promise((resolve) => {
          detector.onResults((results) => {
            const hasFace = processResults(results)
            isDetectingRef.current = false
            resolve(hasFace)
          })

          detector.send({ image: video }).catch(() => {
            setError("Gagal mendeteksi wajah dari video")
            setStatus("error")
            isDetectingRef.current = false
            resolve(false)
          })
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        setError(message)
        setStatus("error")
        isDetectingRef.current = false
        return false
      }
    },
    [loadFaceDetection, processResults]
  )

  // Detect face from image element
  const detectFromImage = useCallback(
    async (image: HTMLImageElement | HTMLCanvasElement): Promise<boolean> => {
      if (isDetectingRef.current) return false

      try {
        isDetectingRef.current = true
        setStatus("detecting")

        const detector = await loadFaceDetection()

        return new Promise((resolve) => {
          detector.onResults((results) => {
            const hasFace = processResults(results)
            isDetectingRef.current = false
            resolve(hasFace)
          })

          detector.send({ image }).catch(() => {
            setError("Gagal mendeteksi wajah dari gambar")
            setStatus("error")
            isDetectingRef.current = false
            resolve(false)
          })
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        setError(message)
        setStatus("error")
        isDetectingRef.current = false
        return false
      }
    },
    [loadFaceDetection, processResults]
  )

  // Draw face bounding box on canvas
  const drawFaceBox = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      color: string = "#22c55e"
    ) => {
      if (!faceBox) return

      // Convert normalized coordinates to canvas coordinates
      const x = faceBox.x * width
      const y = faceBox.y * height
      const w = faceBox.width * width
      const h = faceBox.height * height

      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.strokeRect(x, y, w, h)

      // Draw corner accents
      const cornerLength = Math.min(w, h) * 0.15
      ctx.lineWidth = 4

      // Top-left corner
      ctx.beginPath()
      ctx.moveTo(x, y + cornerLength)
      ctx.lineTo(x, y)
      ctx.lineTo(x + cornerLength, y)
      ctx.stroke()

      // Top-right corner
      ctx.beginPath()
      ctx.moveTo(x + w - cornerLength, y)
      ctx.lineTo(x + w, y)
      ctx.lineTo(x + w, y + cornerLength)
      ctx.stroke()

      // Bottom-left corner
      ctx.beginPath()
      ctx.moveTo(x, y + h - cornerLength)
      ctx.lineTo(x, y + h)
      ctx.lineTo(x + cornerLength, y + h)
      ctx.stroke()

      // Bottom-right corner
      ctx.beginPath()
      ctx.moveTo(x + w - cornerLength, y + h)
      ctx.lineTo(x + w, y + h)
      ctx.lineTo(x + w, y + h - cornerLength)
      ctx.stroke()
    },
    [faceBox]
  )

  // Start continuous face detection (for live camera feed)
  const startContinuousDetection = useCallback(
    (video: HTMLVideoElement, onDetection?: (hasFace: boolean) => void) => {
      continuousDetectionRef.current = true

      const detect = async () => {
        if (!continuousDetectionRef.current) return
        if (video.readyState >= 2) {
          const hasFace = await detectFromVideo(video)
          onDetection?.(hasFace)
        }
        animationFrameRef.current = requestAnimationFrame(detect)
      }

      // Start with a small delay to ensure video is ready
      setTimeout(detect, 100)
    },
    [detectFromVideo]
  )

  // Stop continuous detection
  const stopContinuousDetection = useCallback(() => {
    continuousDetectionRef.current = false
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopContinuousDetection()
      if (faceDetectionRef.current) {
        faceDetectionRef.current.close()
        faceDetectionRef.current = null
      }
    }
  }, [stopContinuousDetection])

  return {
    status,
    faceBox,
    faceCount,
    error,
    isReady: status === "ready" || status === "face-detected" || status === "no-face",
    detectFromVideo,
    detectFromImage,
    drawFaceBox,
    startContinuousDetection,
    stopContinuousDetection,
  }
}
