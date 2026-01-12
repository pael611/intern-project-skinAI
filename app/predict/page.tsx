"use client"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useFaceDetection } from "@/hooks/useFaceDetection"

// Helper: save prediction history via API
async function savePrediction(payload: { label: string; confidence: number; source: "upload" | "camera"; occurred_at?: string }) {
  try {
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || "Failed to save prediction")
    }
    return await res.json()
  } catch (e) {
    console.error("Save prediction error:", e)
    return null
  }
}

type TreatmentRow = {
  Id: string
  Brand: string
  "Product Name": string
  Price: string
  Links: string
  Tags: string
}

type OrtTensor = unknown

type OrtSession = {
  inputNames?: string[]
  inputMetadata: Record<string, unknown>
  outputNames?: string[]
  run: (feeds: Record<string, unknown>) => Promise<Record<string, { data: Float32Array }>>
}

type OrtNamespace = {
  Tensor: new (type: string, data: Float32Array, dims: number[]) => OrtTensor
  InferenceSession: { create: (modelUrl: string) => Promise<OrtSession> }
}

const MODEL_URL = "/model/best_skin_model.onnx"
// Match TF2ONNX export input signature: (None, 320, 320, 3)
const INPUT_SIZE = 320
const categories = [
  "Acne",
  "Blackheads",
  "Dark Spots",
  "Normal Skin",
  "Oily Skin",
  "Wrinkles",
]

export default function PredictPage() {
  const [sessionReady, setSessionReady] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState<string>("Loading ONNX model…")
  const [treatments, setTreatments] = useState<TreatmentRow[]>([])
  const [resultHtml, setResultHtml] = useState<string>("")
  const [predictedTag, setPredictedTag] = useState<string | null>(null)
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageTensorRef = useRef<OrtTensor | null>(null)
  const ortRef = useRef<OrtNamespace | null>(null)
  const sessionRef = useRef<OrtSession | null>(null)
  const camStreamRef = useRef<MediaStream | null>(null)

  // Face detection hook
  const {
    status: faceStatus,
    faceBox,
    faceCount,
    error: faceError,
    detectFromVideo,
    detectFromImage,
    drawFaceBox,
    startContinuousDetection,
    stopContinuousDetection,
  } = useFaceDetection()

  // Load treatments
  useEffect(() => {
    fetch("/skincare_product/treatment.json")
      .then((r) => r.json())
      .then((data) => setTreatments(data))
      .catch(() => {})
  }, [])

  // Draw face detection overlay on video
  useEffect(() => {
    if (!cameraActive || !overlayCanvasRef.current || !videoRef.current) return

    const video = videoRef.current
    const canvas = overlayCanvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const draw = () => {
      if (!cameraActive) return
      
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw face bounding box if detected
      if (faceBox) {
        drawFaceBox(ctx, canvas.width, canvas.height, "#22c55e")
      }

      requestAnimationFrame(draw)
    }

    draw()
  }, [cameraActive, faceBox, drawFaceBox])

  // Load ORT from CDN to avoid bundler ESM issues
  function loadOrtFromCdn() {
    return new Promise<OrtNamespace>((resolve, reject) => {
      if (typeof window === "undefined") return reject(new Error("Not in browser"))
      const win = window as unknown as { ort?: OrtNamespace }
      if (win.ort) return resolve(win.ort)
      const existing = document.getElementById("ort-cdn-script") as HTMLScriptElement | null
      if (existing) {
        existing.addEventListener("load", () => resolve((window as unknown as { ort?: OrtNamespace }).ort!))
        existing.addEventListener("error", () => reject(new Error("Failed to load ORT CDN script")))
        return
      }
      const script = document.createElement("script")
      script.id = "ort-cdn-script"
      script.src = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js"
      script.async = true
      script.crossOrigin = "anonymous"
      script.onload = () => resolve((window as unknown as { ort?: OrtNamespace }).ort!)
      script.onerror = () => reject(new Error("Failed to load ORT CDN script"))
      document.head.appendChild(script)
    })
  }

  // Initialize ORT session and warm cache
  useEffect(() => {
    if (sessionRef.current) return
    ;(async () => {
      try {
        setLoadingMsg("Loading ONNX runtime…")
        // Load ORT via CDN to force browser build
        if (!ortRef.current) {
          ortRef.current = await loadOrtFromCdn()
        }
        setLoadingMsg("Loading ONNX model…")
        // Warm the browser cache
        try { await fetch(MODEL_URL, { cache: "force-cache" }) } catch {}
        // Create session
        sessionRef.current = await ortRef.current.InferenceSession.create(MODEL_URL)
        // Optional: warm up kernels with a dummy input
        const dummy = new ortRef.current.Tensor("float32", new Float32Array(INPUT_SIZE * INPUT_SIZE * 3), [1, INPUT_SIZE, INPUT_SIZE, 3])
        const inputName = sessionRef.current.inputNames?.[0] ?? Object.keys(sessionRef.current.inputMetadata)[0]
        try { await sessionRef.current.run({ [inputName]: dummy }) } catch {}
        setSessionReady(true)
        setLoadingMsg("Model loaded. Upload an image or use camera.")
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        setLoadingMsg(`Failed to load model: ${message}`)
      }
    })()
  }, [])

  function setResult(html: string) {
    setResultHtml(html)
  }

  async function onFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    
    // Reset face detection state
    setFaceDetected(null)
    setPredictedTag(null)
    setResultHtml("")
    
    const reader = new FileReader()
    reader.onload = async () => {
      const src = reader.result as string
      setPreviewSrc(src)

      // Detect face using an off-DOM Image element (works with next/image)
      const probe = new window.Image()
      probe.crossOrigin = "anonymous"
      probe.onload = async () => {
        setResult('<div class="text-blue-600 animate-pulse">🔍 Mendeteksi wajah...</div>')
        try {
          const hasFace = await detectFromImage(probe)
          setFaceDetected(hasFace)

          if (hasFace) {
            setResult('<div class="text-emerald-600">✅ Wajah terdeteksi! Silakan klik Prediksi.</div>')
          } else {
            setResult('<div class="text-amber-600">⚠️ Tidak ada wajah terdeteksi. Pastikan gambar berisi wajah yang jelas.</div>')
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          setFaceDetected(false)
          setResult(`<div class="text-amber-600">⚠️ Gagal mendeteksi wajah: ${msg}</div>`)
        }
      }
      probe.src = src
    }
    reader.readAsDataURL(file)
  }

  function preprocessImage(img: HTMLImageElement, size = INPUT_SIZE) {
    const ort = ortRef.current
    if (!ort) {
      throw new Error("ONNX runtime not loaded")
    }

    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")!

    // Center-crop preserve aspect ratio
    const sw = img.naturalWidth || img.width
    const sh = img.naturalHeight || img.height
    const arSrc = sw / sh
    const arDst = 1
    let sx = 0,
      sy = 0,
      sWidth = sw,
      sHeight = sh
    if (arSrc > arDst) {
      sWidth = sh * arDst
      sx = (sw - sWidth) / 2
    } else {
      sHeight = sw / arDst
      sy = (sh - sHeight) / 2
    }
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, size, size)

    const imageData = ctx.getImageData(0, 0, size, size)
    const { data } = imageData
    const arr = new Float32Array(size * size * 3)
    // Normalize to [-1, 1] (MobileNetV2-style) or adjust per your model
    for (let i = 0; i < size * size; i++) {
      arr[i * 3 + 0] = data[i * 4 + 0] / 127.5 - 1
      arr[i * 3 + 1] = data[i * 4 + 1] / 127.5 - 1
      arr[i * 3 + 2] = data[i * 4 + 2] / 127.5 - 1
    }
    // Return NHWC tensor [1, size, size, 3]
    return new ort.Tensor("float32", arr, [1, size, size, 3])
  }

  async function runPredict() {
    const session = sessionRef.current
    if (!session) {
      setResult("Model not loaded")
      return
    }
    if (!previewSrc) {
      setResult("Please upload an image first.")
      return
    }
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = async () => {
      imageTensorRef.current = preprocessImage(img)
      try {
        const feeds: Record<string, unknown> = {}
        const inputName = session.inputNames?.[0] ?? Object.keys(session.inputMetadata)[0]
        feeds[inputName] = imageTensorRef.current
        setResult("Running inference…")
        const output = await session.run(feeds)
        const outName = session.outputNames?.[0] ?? Object.keys(output)[0]
        const scores: Float32Array = output[outName].data
        let bestIdx = 0
        for (let i = 1; i < scores.length; i++) if (scores[i] > scores[bestIdx]) bestIdx = i
        const bestScore = scores[bestIdx]
        const label = categories[bestIdx] ?? `class_${bestIdx}`

        const html = `<div class=\"rounded border border-emerald-200 bg-emerald-50 p-3 text-emerald-800\"><b>Prediksi:</b> ${label}<br/><b>Confidence:</b> ${(bestScore * 100).toFixed(2)}%</div>`
        setPredictedTag(label)
        setResult(html)

        // Save to history (anonymous or with user if signed-in)
        await savePrediction({ label, confidence: Number((bestScore).toFixed(6)), source: camStreamRef.current ? "camera" : "upload", occurred_at: new Date().toISOString() })
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        setResult(`Inference failed: ${message}`)
      }
    }
    img.src = previewSrc
  }

  function Recommendations({ tag }: { tag: string }) {
    const imageCacheRef = useRef(new Map<string, string | null>())
    const produk = treatments.filter((row) => row.Tags?.toLowerCase() === tag.toLowerCase())
    if (produk.length === 0) {
      return <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-400/30 dark:bg-neutral-900 dark:text-amber-300">Tidak ada rekomendasi produk untuk kategori ini.</div>
    }

    function ProductImage({ productId }: { productId: string }) {
      const [src, setSrc] = useState<string | null>(() => imageCacheRef.current.get(productId) ?? null)
      const [missing, setMissing] = useState<boolean>(() => imageCacheRef.current.get(productId) === null)

      useEffect(() => {
        let cancelled = false
        const cached = imageCacheRef.current.get(productId)
        if (cached !== undefined) {
          setSrc(cached)
          setMissing(cached === null)
          return
        }

        async function resolve() {
          if (!productId) {
            imageCacheRef.current.set(productId, null)
            if (!cancelled) {
              setSrc(null)
              setMissing(true)
            }
            return
          }

          const exts = ["png", "jpg"]
          for (const ext of exts) {
            const url = `/skincare_product/gambar_produk/${productId}.${ext}`
            try {
              const head = await fetch(url, { method: "HEAD", cache: "force-cache" })
              if (head.ok) {
                imageCacheRef.current.set(productId, url)
                if (!cancelled) {
                  setSrc(url)
                  setMissing(false)
                }
                return
              }

              // Some static hosts may not support HEAD; fallback to GET.
              if (head.status === 405 || head.status === 501) {
                const get = await fetch(url, { method: "GET", cache: "force-cache" })
                if (get.ok) {
                  imageCacheRef.current.set(productId, url)
                  if (!cancelled) {
                    setSrc(url)
                    setMissing(false)
                  }
                  return
                }
              }
            } catch {
              // ignore and try next extension
            }
          }

          imageCacheRef.current.set(productId, null)
          if (!cancelled) {
            setSrc(null)
            setMissing(true)
          }
        }

        void resolve()
        return () => {
          cancelled = true
        }
      }, [productId])

      if (missing) {
        return (
          <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-neutral-50 text-center text-[10px] leading-tight text-neutral-500 ring-1 ring-emerald-100 group-hover:ring-emerald-200 dark:bg-neutral-900 dark:text-neutral-400 dark:ring-emerald-700/50">
            Gambar tidak tersedia
          </div>
        )
      }

      if (!src) {
        return <div className="h-24 w-24 animate-pulse rounded-xl bg-neutral-100 ring-1 ring-emerald-100 dark:bg-neutral-800 dark:ring-emerald-700/50" />
      }

      return (
        <Image
          src={src}
          alt="produk"
          width={96}
          height={96}
          sizes="96px"
          className="h-24 w-24 rounded-xl object-cover ring-1 ring-emerald-100 group-hover:ring-emerald-200 dark:ring-emerald-700/50"
          onError={() => {
            imageCacheRef.current.set(productId, null)
            setMissing(true)
          }}
        />
      )
    }

    return (
      <div className="mt-8">
        <h4 className="mb-4 text-xl font-extrabold tracking-tight text-emerald-900">Rekomendasi Produk</h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {produk.map((row) => {
            return (
              <div
                key={row.Id || row["Product Name"]}
                className="group flex items-center gap-4 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-emerald-800/40 dark:bg-emerald-900/20"
              >
                <ProductImage productId={row.Id} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-neutral-500">{row.Brand}</div>
                  <div className="truncate text-lg font-semibold text-neutral-900">{row["Product Name"]}</div>
                  <div className="mt-1 inline-flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">{row.Price}</span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700">{tag}</span>
                  </div>
                  <div className="mt-3">
                    <a
                      href={row.Links}
                      target="_blank"
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-50"
                    >
                      Lihat Produk
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-emerald-700">
                        <path d="M7 17L17 7M17 7H9M17 7V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  async function startCamera() {
    if (!videoRef.current) return
    // Feature detection and secure context requirement
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setResult('<div class="alert alert-danger">Browser tidak mendukung camera API.</div>')
      return
    }
    if (window.isSecureContext === false) {
      setResult('<div class="alert alert-warning">Kamera memerlukan konteks aman (HTTPS atau http://localhost). Pastikan aplikasi berjalan di http://localhost atau gunakan HTTPS.</div>')
    }
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      }
      camStreamRef.current = await navigator.mediaDevices.getUserMedia(constraints)
      videoRef.current.srcObject = camStreamRef.current
      videoRef.current.setAttribute("playsinline", "true")
      videoRef.current.style.display = "block"
      await videoRef.current.play().catch(() => {})
      setCameraActive(true)
      setFaceDetected(null)
      setPredictedTag(null)
      setResult('<div class="text-blue-600 animate-pulse">🔍 Memulai deteksi wajah...</div>')
      
      // Start continuous face detection
      startContinuousDetection(videoRef.current, (hasFace: boolean) => {
        setFaceDetected(hasFace)
      })
    } catch (e: unknown) {
      const err = e as { name?: unknown; message?: unknown }
      const name = typeof err?.name === 'string' ? err.name : 'Error'
      const msg = typeof err?.message === 'string' ? err.message : String(e)
      let hint = ""
      if (name === "NotAllowedError") {
        hint = "Izin kamera ditolak. Buka pengaturan site pada browser dan izinkan kamera."
      } else if (name === "NotFoundError") {
        hint = "Perangkat kamera tidak ditemukan. Pastikan kamera terhubung dan tidak dipakai aplikasi lain."
      } else if (name === "NotReadableError") {
        hint = "Kamera sedang dipakai aplikasi lain. Tutup aplikasi kamera lain dan coba lagi."
      }
      setResult(`<div class="alert alert-danger">Tidak bisa mengakses kamera: ${msg}${hint ? "<br>" + hint : ""}</div>`)
    }
  }

  function stopCamera() {
    // Stop face detection
    stopContinuousDetection()
    setCameraActive(false)
    
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach((t) => t.stop())
      camStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current.style.display = "none"
    }
    setFaceDetected(null)
    setResult("")
  }

  async function captureFrame() {
    if (!videoRef.current || !canvasRef.current) return
    
    // Check if face is detected before capturing
    if (!faceDetected) {
      setResult('<div class="text-amber-600">⚠️ Tidak ada wajah terdeteksi. Posisikan wajah Anda di depan kamera.</div>')
      return
    }
    
    const vw = videoRef.current.videoWidth
    const vh = videoRef.current.videoHeight
    const ar = vw / vh
    let sx = 0,
      sy = 0,
      sw = vw,
      sh = vh
    if (ar > 1) {
      sw = vh
      sx = (vw - sw) / 2
    } else {
      sh = vw
      sy = (vh - sh) / 2
    }
    const ctx = canvasRef.current.getContext("2d")!
    ctx.clearRect(0, 0, INPUT_SIZE, INPUT_SIZE)
    ctx.drawImage(videoRef.current, sx, sy, sw, sh, 0, 0, INPUT_SIZE, INPUT_SIZE)
    const dataUrl = canvasRef.current.toDataURL("image/png")
    setPreviewSrc(dataUrl)
    
    // Stop camera after capture
    stopCamera()
    
    setResult('<div class="text-emerald-600">✅ Foto berhasil diambil! Silakan klik Prediksi.</div>')
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h2 className="mb-6 text-center text-2xl font-bold">Prediksi Penyakit Kulit Wajah (ONNX)</h2>
      <div className="space-y-4">
        <input type="file" accept="image/*" className="w-full rounded border border-neutral-300 px-3 py-2 focus:border-emerald-600 focus:outline-none" onChange={onFileChange} />
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button className="w-full rounded border border-neutral-300 px-4 py-2 text-neutral-700 hover:bg-neutral-100 sm:w-auto" onClick={startCamera}>Buka Kamera</button>
          <button 
            className={`w-full rounded border px-4 py-2 sm:w-auto ${
              faceDetected 
                ? "border-emerald-600 text-emerald-700 hover:bg-emerald-50" 
                : "border-neutral-300 text-neutral-400 cursor-not-allowed"
            }`} 
            onClick={captureFrame}
            disabled={!faceDetected}
          >
            Ambil Foto
          </button>
          <button className="w-full rounded border border-red-600 px-4 py-2 text-red-700 hover:bg-red-50 sm:w-auto" onClick={stopCamera}>Matikan Kamera</button>
        </div>
        
        {/* Face Detection Status Indicator */}
        {cameraActive && (
          <div className={`mx-auto max-w-md rounded-lg border p-3 text-center text-sm ${
            faceDetected === null 
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : faceDetected 
                ? "border-emerald-200 bg-emerald-50 text-emerald-700" 
                : "border-amber-200 bg-amber-50 text-amber-700"
          }`}>
            <div className="flex items-center justify-center gap-2">
              {faceDetected === null ? (
                <>
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                  <span>Memuat face detection...</span>
                </>
              ) : faceDetected ? (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <span>Wajah terdeteksi ({faceCount} wajah) - Siap mengambil foto!</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span>Tidak ada wajah - Posisikan wajah di depan kamera</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Video Container with Overlay */}
        <div className="relative flex justify-center">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className={`hidden max-w-[320px] rounded ${cameraActive ? "!block" : ""}`}
            style={{ transform: "scaleX(-1)" }}
          />
          <canvas 
            ref={overlayCanvasRef} 
            className={`pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 ${cameraActive ? "block" : "hidden"}`}
            style={{ maxWidth: "320px", transform: "scaleX(-1)" }}
          />
        </div>
        
        <canvas ref={canvasRef} width={INPUT_SIZE} height={INPUT_SIZE} className="hidden" />
        <div className="flex justify-center">
          {previewSrc ? (
            <Image
              id="preview"
              src={previewSrc}
              alt="Preview"
              width={320}
              height={320}
              unoptimized
              className="max-w-[320px] rounded border border-neutral-200"
              style={{ height: "auto" }}
            />
          ) : null}
        </div>
        <div className="flex justify-center">
          <button className="w-full rounded bg-emerald-600 px-5 py-2.5 text-white hover:bg-emerald-700 disabled:opacity-50 sm:w-auto" onClick={runPredict} disabled={!sessionReady}>Prediksi</button>
        </div>
        {sessionReady ? (
          resultHtml ? (
            <div className="result text-neutral-700" dangerouslySetInnerHTML={{ __html: resultHtml }} />
          ) : (
            <div className="mx-auto max-w-md">
              <div className="rounded-lg border border-emerald-200 bg-white p-4 text-sm text-neutral-800 shadow-sm">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="font-medium">Model berhasil dimuat</span>
                </div>
                <p className="mt-2 text-neutral-700">Unggah gambar atau gunakan kamera, lalu tekan <span className="font-semibold">Prediksi</span> untuk mulai.</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-emerald-500" />
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:150ms]" />
                  <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="mx-auto max-w-md">
            <div className="animate-pulse rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="font-medium">Memuat model ONNX…</span>
              </div>
              <p className="mt-2 text-emerald-700">Menyiapkan sesi inferensi agar prediksi lebih cepat saat Anda mulai.</p>
              <div className="mt-3 h-2 w-full rounded bg-emerald-100">
                <div className="h-2 w-1/2 rounded bg-emerald-400"></div>
              </div>
            </div>
          </div>
        )}
        {predictedTag ? <Recommendations tag={predictedTag} /> : null}
      </div>
    </main>
  )
}
