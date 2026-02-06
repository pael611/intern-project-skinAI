"use client"
import { useEffect, useRef, useState, type ChangeEvent } from "react"
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

type OnlineProductRow = {
  id_product: number
  nama_product: string
  label: string
  brand: string
  harga: string
  gambar: string | null
  link: string
  created_at: string
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
// Capture preview at higher resolution than model input (cap to avoid huge data URLs)
const CAPTURE_MAX_SIZE = 1024
const CAPTURE_MIME: 'image/jpeg' | 'image/png' = 'image/jpeg'
const CAPTURE_JPEG_QUALITY = 0.95
const categories = [
  "Acne",
  "Blackheads",
  "light Spots",
  "Normal Skin",
  "Oily Skin",
  "Wrinkles",
]

const FACE_NOT_DETECTED_SHORT = "Wajah tidak terdeteksi sempurna. Tetap tenang, prediksi masih bisa dilakukan."

export default function PredictPage() {
  const [sessionReady, setSessionReady] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState<string>("Loading ONNX model…")
  const [resultHtml, setResultHtml] = useState<string>("")
  const [predictedTag, setPredictedTag] = useState<string | null>(null)
  const [predictionConfidence, setPredictionConfidence] = useState<number>(0)
  const [onlineProducts, setOnlineProducts] = useState<OnlineProductRow[]>([])
  const [onlineProductsError, setOnlineProductsError] = useState<string | null>(null)
  const [faceDetected, setFaceDetected] = useState<boolean | null>(null)
  const [lastFaceDetected, setLastFaceDetected] = useState<boolean | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

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

  // Load online products from Supabase via API
  useEffect(() => {
    let cancelled = false
    async function loadOnlineProducts() {
      try {
        setOnlineProductsError(null)
        const res = await fetch('/api/products?limit=200', { cache: 'no-store' })
        const json = (await res.json().catch(() => null)) as { ok?: boolean; data?: OnlineProductRow[]; error?: string } | null
        if (!res.ok) {
          throw new Error(json?.error || `Failed to load products (${res.status})`)
        }
        if (!cancelled) {
          setOnlineProducts(Array.isArray(json?.data) ? json!.data! : [])
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        if (!cancelled) {
          setOnlineProducts([])
          setOnlineProductsError(msg)
        }
      }
    }

    void loadOnlineProducts()
    return () => {
      cancelled = true
    }
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
        drawFaceBox(ctx, canvas.width, canvas.height, "#10b981")
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

  async function onFileChange(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    
    // Reset face detection state
    setFaceDetected(null)
    setLastFaceDetected(null)
    setPredictedTag(null)
    setResultHtml("")
    setPredictionConfidence(0)
    
    const reader = new FileReader()
    reader.onload = async () => {
      const src = reader.result as string
      setPreviewSrc(src)

      // Detect face using an off-DOM Image element (works with next/image)
      const probe = new window.Image()
      probe.crossOrigin = "anonymous"
      probe.onload = async () => {
        setResult('<div class="flex items-center gap-2 text-blue-600"><div class="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div><span>Mendeteksi wajah...</span></div>')
        try {
          const hasFace = await detectFromImage(probe)
          setFaceDetected(hasFace)
          setLastFaceDetected(hasFace)

          if (hasFace) {
            setResult('')
          } else {
            setResult('')
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          setFaceDetected(false)
          setLastFaceDetected(false)
          setResult(`<div class="text-amber-600">⚠️ Gagal mendeteksi wajah: ${msg}<br/>Anda tetap bisa melakukan prediksi.</div>`)
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
    
    setIsAnalyzing(true)
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = async () => {
      imageTensorRef.current = preprocessImage(img)
      try {
        const feeds: Record<string, unknown> = {}
        const inputName = session.inputNames?.[0] ?? Object.keys(session.inputMetadata)[0]
        feeds[inputName] = imageTensorRef.current
        setResult('<div class="flex items-center gap-2 text-emerald-600"><div class="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"></div><span>Menganalisis kondisi kulit...</span></div>')
        
        const output = await session.run(feeds)
        const outName = session.outputNames?.[0] ?? Object.keys(output)[0]
        const scores: Float32Array = output[outName].data
        let bestIdx = 0
        for (let i = 1; i < scores.length; i++) if (scores[i] > scores[bestIdx]) bestIdx = i
        const bestScore = scores[bestIdx]
        const label = categories[bestIdx] ?? `class_${bestIdx}`

        setPredictedTag(label)
        setPredictionConfidence(bestScore)
        setResult('')
        setIsAnalyzing(false)

        // Save to history (anonymous or with user if signed-in)
        void (await savePrediction({ label, confidence: Number((bestScore).toFixed(6)), source: camStreamRef.current ? "camera" : "upload", occurred_at: new Date().toISOString() }))
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e)
        setResult(`<div class="text-red-600">Inference failed: ${message}</div>`)
        setIsAnalyzing(false)
      }
    }
    img.src = previewSrc
  }

  function getSeverityInfo(tag: string) {
    const key = tag.toLowerCase()

    if (key.includes("normal")) {
      return {
        level: "Kulit Normal",
        description:
          "Kondisi kulit Anda tergolong seimbang. Tetap jaga dengan rutin membersihkan, melembapkan, dan menggunakan tabir surya.",
        bgColor: "bg-emerald-100 text-emerald-800 light:bg-emerald-900/40",
        color: "",
      }
    }

    if (key.includes("acne")) {
      return {
        level: "Kulit Berjerawat",
        description:
          "Terlihat adanya kemunculan jerawat. Rutin gunakan produk non‑komedogenik dan hindari memencet jerawat untuk mencegah bekas.",
        bgColor: "bg-red-100 text-red-800 light:bg-red-900/40",
        color: "",
      }
    }

    if (key.includes("black")) {
      return {
        level: "Komedo / Blackheads",
        description:
          "Terdapat komedo pada area tertentu. Gunakan pembersih yang lembut dan produk dengan kandungan eksfoliasi ringan.",
        bgColor: "bg-amber-100 text-amber-800 light:bg-amber-900/40",
        color: "",
      }
    }

    if (key.includes("oily")) {
      return {
        level: "Kulit Berminyak",
        description:
          "Produksi minyak berlebih terdeteksi. Pilih pelembap ringan dan produk yang mengontrol sebum tanpa membuat kulit kering.",
        bgColor: "bg-yellow-100 text-yellow-800 light:bg-yellow-900/40",
        color: "",
      }
    }

    if (key.includes("wrinkle")) {
      return {
        level: "Garis Halus / Kerutan",
        description:
          "Mulai tampak garis halus atau kerutan. Pertimbangkan produk dengan antioksidan dan gunakan tabir surya setiap hari.",
        bgColor: "bg-purple-100 text-purple-800 light:bg-purple-900/40",
        color: "",
      }
    }

    if (key.includes("spot")) {
      return {
        level: "Noda / Light Spots",
        description:
          "Terdapat area dengan warna kulit tidak merata. Gunakan perlindungan matahari dan perawatan pencerah yang lembut.",
        bgColor: "bg-sky-100 text-sky-800 light:bg-sky-900/40",
        color: "",
      }
    }

    return {
      level: "Kondisi Kulit",
      description:
        "Sistem mendeteksi kondisi kulit spesifik. Ikuti rekomendasi produk di bawah sebagai langkah perawatan awal.",
      bgColor: "bg-neutral-100 text-neutral-800 light:bg-neutral-800",
      color: "",
    }
  }

  function PredictionResult({ tag, confidence }: { tag: string; confidence: number }) {
    const severityInfo = getSeverityInfo(tag)

    return (
      <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-8 shadow-2xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <p className="mb-2 text-sm font-medium text-white/80">Hasil Diagnosa</p>
            <h3 className="mb-3 text-4xl font-bold text-white">{tag}</h3>
            <p className="mb-4 text-white/90">{severityInfo.description}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${severityInfo.bgColor} ${severityInfo.color}`}>
                {severityInfo.level}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-white/20 backdrop-blur-md p-6 text-center">
            <p className="mb-1 text-sm font-medium text-white/80">Confidence</p>
            <p className="text-5xl font-bold text-white">{(confidence * 100).toFixed(0)}%</p>
            <div className="mt-3 h-2 w-32 overflow-hidden rounded-full bg-white/30">
              <div 
                className="h-full rounded-full bg-white shadow-lg transition-all duration-1000"
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  function Recommendations({ tag }: { tag: string }) {
    const [ratings, setRatings] = useState<Record<string, number>>({})
    const [ratingsLoaded, setRatingsLoaded] = useState(false)
    const [ratingError, setRatingError] = useState<string | null>(null)

    const produkOnline = onlineProducts.filter(
      (p) => String(p.label || "").toLowerCase() === tag.toLowerCase()
    )

    const productIds = Array.from(
      new Set(
        produkOnline
          .map((p) => String(p.id_product ?? "").trim())
          .filter(Boolean)
      )
    ).slice(0, 200)

    const productIdsKey = productIds.join(",")

    useEffect(() => {
      let cancelled = false

      async function loadRatings() {
        setRatingsLoaded(false)
        setRatingError(null)
        try {
          if (!productIdsKey) {
            if (!cancelled) {
              setRatings({})
              setRatingsLoaded(true)
            }
            return
          }

          const qs = encodeURIComponent(productIdsKey)
          const res = await fetch(`/api/predictions/rate?productIds=${qs}`, {
            cache: "no-store",
          })

          if (res.status === 401) {
            if (!cancelled) {
              setRatings({})
              setRatingsLoaded(true)
            }
            return
          }

          const json = (await res.json().catch(() => null)) as
            | { ok?: boolean; ratings?: Record<string, number>; error?: string }
            | null

          if (!res.ok) {
            const msg = json?.error || `Failed to load ratings (${res.status})`
            throw new Error(msg)
          }

          if (!cancelled) {
            setRatings(json?.ratings ?? {})
            setRatingsLoaded(true)
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          if (!cancelled) {
            setRatings({})
            setRatingsLoaded(true)
            setRatingError(msg)
          }
        }
      }

      void loadRatings()
      return () => {
        cancelled = true
      }
    }, [tag, productIdsKey])

    const items = produkOnline.map((p, idx) => ({
      kind: "online" as const,
      idx,
      id: String(p.id_product),
      brand: p.brand,
      name: p.nama_product,
      price: p.harga,
      link: p.link,
      tag: p.label || tag,
      image: { type: "url" as const, src: p.gambar },
    }))

    const itemsSorted = items
      .slice()
      .sort((a, b) => {
        const ra = ratings[a.id] ?? 0
        const rb = ratings[b.id] ?? 0
        if (rb !== ra) return rb - ra
        return a.idx - b.idx
      })

    function OnlineImage({ src, alt }: { src: string | null; alt: string }) {
      if (!src) {
        return (
          <div className="h-28 w-28 rounded-2xl bg-gradient-to-br from-neutral-200 to-neutral-300 ring-2 ring-emerald-100/50 light:from-neutral-800 light:to-neutral-900 light:ring-emerald-700/30" />
        )
      }

      return (
        <div className="h-28 w-28 overflow-hidden rounded-2xl ring-2 ring-emerald-100/50 transition-all duration-300 group-hover:ring-emerald-300 group-hover:shadow-lg light:ring-emerald-700/30">
          <Image
            src={src}
            alt={alt}
            width={112}
            height={112}
            sizes="112px"
            unoptimized
            className="h-28 w-28 object-cover transition-transform duration-300 ease-out hover:scale-125"
          />
        </div>
      )
    }

    return (
      <div className="mt-8 rounded-3xl bg-white p-8 shadow-xl light:bg-neutral-900">
        <div className="mb-6 flex items-center gap-3">
          <svg
            className="h-8 w-8 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          <h4 className="text-3xl font-bold text-neutral-900 light:text-neutral-100">
            Rekomendasi Produk
          </h4>
        </div>

        {!ratingsLoaded && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700 light:border-emerald-800/40 light:bg-emerald-900/20 light:text-emerald-200">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            Memuat preferensi urutan berdasarkan rating…
          </div>
        )}

        {ratingError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 light:border-red-800/40 light:bg-red-900/20 light:text-red-200">
            {ratingError}
          </div>
        )}

        {onlineProductsError && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 light:border-amber-800/40 light:bg-amber-900/20 light:text-amber-200">
            Gagal memuat produk online: {onlineProductsError}
          </div>
        )}

        {itemsSorted.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800 light:border-amber-400/30 light:bg-neutral-900 light:text-amber-300">
            <svg
              className="mx-auto mb-3 h-12 w-12 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="font-semibold">
              Tidak ada rekomendasi produk untuk kategori ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {itemsSorted.map((item, index) => (
              <div
                key={`${item.kind}-${item.id}`}
                className="group relative overflow-hidden rounded-2xl border-2 border-emerald-100 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl light:border-emerald-800/40 light:bg-neutral-800"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="shrink-0">
                    <OnlineImage src={item.image.src ?? null} alt={item.name} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-sm font-medium text-neutral-500 light:text-neutral-400">
                      {item.brand}
                    </div>
                    <h5 className="mb-3 line-clamp-2 text-lg font-bold text-neutral-900 light:text-neutral-100">
                      {item.name}
                    </h5>

                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 px-3 py-1 text-sm font-bold text-emerald-700 light:from-emerald-900/40 light:to-teal-900/40 light:text-emerald-200">
                        {item.price}
                      </span>
                      <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 light:bg-neutral-700 light:text-neutral-200">
                        {item.tag}
                      </span>
                      {(ratings[item.id] ?? 0) > 0 && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 light:bg-amber-900/30 light:text-amber-200">
                          ★ {ratings[item.id]}/5
                        </span>
                      )}
                      {item.kind === "online" && (
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 light:bg-blue-900/30 light:text-blue-200">
                          Online Store
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-neutral-500 light:text-neutral-400">
                      Atur rating produk di halaman
                      <a
                        className="ml-1 text-emerald-700 underline light:text-emerald-300"
                        href="/profile"
                      >
                        Profil
                      </a>
                      .
                    </div>

                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-100 hover:shadow-md light:border-emerald-700/40 light:bg-emerald-900/20 light:text-emerald-200 light:hover:bg-emerald-900/40"
                    >
                      Lihat Detail Produk
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  async function startCamera() {
    if (!videoRef.current) return
    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setResult('<div class="text-red-600">Browser tidak mendukung camera API.</div>')
      return
    }
    if (window.isSecureContext === false) {
      setResult('<div class="text-amber-600">Kamera memerlukan konteks aman (HTTPS atau http://localhost).</div>')
    }
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
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
      setLastFaceDetected(null)
      setPredictedTag(null)
      setResult('')
      
      startContinuousDetection(videoRef.current, (hasFace: boolean) => {
        setFaceDetected(hasFace)
      })
    } catch (e: unknown) {
      const err = e as { name?: unknown; message?: unknown }
      const name = typeof err?.name === 'string' ? err.name : 'Error'
      const msg = typeof err?.message === 'string' ? err.message : String(e)
      let hint = ""
      if (name === "NotAllowedError") {
        hint = " Izin kamera ditolak. Buka pengaturan browser dan izinkan kamera."
      } else if (name === "NotFoundError") {
        hint = " Perangkat kamera tidak ditemukan."
      } else if (name === "NotReadableError") {
        hint = " Kamera sedang dipakai aplikasi lain."
      }
      setResult(`<div class="text-red-600">Tidak bisa mengakses kamera: ${msg}${hint}</div>`)
    }
  }

  function stopCamera(options?: { keepResult?: boolean }) {
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
    if (!options?.keepResult) setResult("")
  }

  async function captureFrame() {
    if (!videoRef.current || !canvasRef.current) return

    const capturedHasFace = faceDetected === true
    setLastFaceDetected(capturedHasFace)
    
    const vw = videoRef.current.videoWidth
    const vh = videoRef.current.videoHeight
    if (!vw || !vh) {
      setResult('<div class="text-amber-600">⚠️ Kamera belum siap. Tunggu sebentar lalu coba lagi.</div>')
      return
    }

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

    const captureSize = Math.min(Math.max(1, Math.floor(Math.min(sw, sh))), CAPTURE_MAX_SIZE)
    canvasRef.current.width = captureSize
    canvasRef.current.height = captureSize
    const ctx = canvasRef.current.getContext("2d")!
    ctx.imageSmoothingEnabled = true
    ;(ctx as unknown as { imageSmoothingQuality?: 'low' | 'medium' | 'high' }).imageSmoothingQuality = "high"
    ctx.clearRect(0, 0, captureSize, captureSize)
    ctx.drawImage(videoRef.current, sx, sy, sw, sh, 0, 0, captureSize, captureSize)

    const dataUrl =
      CAPTURE_MIME === 'image/jpeg'
        ? canvasRef.current.toDataURL(CAPTURE_MIME, CAPTURE_JPEG_QUALITY)
        : canvasRef.current.toDataURL(CAPTURE_MIME)
    setPreviewSrc(dataUrl)
    
    stopCamera({ keepResult: true })

    setResult('')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 px-4 py-12">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        
        body {
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-lg dark:bg-neutral-800">
            <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></div>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">AI Powered Analysis</span>
          </div>
          <h2 className="mb-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-5xl font-extrabold text-transparent">
            Deteksi Kondisi Kulit
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-neutral-600 light:text-neutral-400">
            Upload foto wajah Anda atau gunakan kamera untuk analisis kondisi kulit dengan teknologi AI yang akurat
          </p>
        </div>

        {/* Main Card */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-2xl light:bg-neutral-900">
          {/* Upload Section */}
          <div className="border-b border-neutral-200 bg-gradient-to-br from-white to-emerald-50/30 p-8 light:border-neutral-800 light:from-neutral-900 light:to-emerald-900/10">
            <div className="mb-6">
              <label className="mb-3 block text-sm font-semibold text-neutral-700 light:text-neutral-300">Upload Foto</label>
              <input
                type="file"
                accept="image/*"
                className="w-full cursor-pointer rounded-xl border-2 border-dashed border-emerald-300 bg-white px-4 py-3 text-sm transition-all hover:border-emerald-500 hover:bg-emerald-50/50 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-100 light:border-emerald-800/40 light:bg-neutral-800 light:hover:bg-emerald-900/20 light:focus:ring-emerald-900/30"
                onChange={onFileChange}
              />
            </div>

            {/* Camera Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                className="group flex items-center gap-2 rounded-xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
                onClick={startCamera}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Buka Kamera
              </button>
              
              <button
                className={`flex items-center gap-2 rounded-xl px-6 py-3 font-semibold shadow-lg transition-all hover:scale-105 active:scale-95 ${
                  !cameraActive
                    ? "cursor-not-allowed border-2 border-neutral-300 bg-neutral-100 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800"
                    : faceDetected
                      ? "border-2 border-emerald-500 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200"
                      : "border-2 border-amber-500 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200"
                }`}
                onClick={captureFrame}
                disabled={!cameraActive}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Ambil Foto
              </button>
              
              <button
                className="flex items-center gap-2 rounded-xl border-2 border-red-500 bg-red-50 px-6 py-3 font-semibold text-red-700 shadow-lg transition-all hover:scale-105 hover:bg-red-100 active:scale-95 light:bg-red-900/20 light:text-red-300 light:hover:bg-red-900/40"
                onClick={() => stopCamera()}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Matikan Kamera
              </button>
            </div>

            {/* Face Detection Warning */}
            {lastFaceDetected === false && !predictedTag && (
              <div className="mt-6 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-center light:border-amber-800/40 light:bg-amber-900/20">
                <div className="mb-2 inline-flex rounded-full bg-amber-100 p-2 light:bg-amber-900/40">
                  <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="font-semibold text-amber-800 light:text-amber-200">{FACE_NOT_DETECTED_SHORT}</p>
              </div>
            )}

            {/* Face Detection Status */}
            {cameraActive && (
              <div className={`mt-6 rounded-2xl border-2 p-4 text-center transition-all ${
                faceDetected === null
                  ? "border-blue-200 bg-blue-50 light:border-blue-800/40 light:bg-blue-900/20"
                  : faceDetected
                    ? "border-emerald-200 bg-emerald-50 light:border-emerald-800/40 light:bg-emerald-900/20"
                    : "border-emerald-200 bg-emerald-50 light:border-emerald-800/40 light:bg-emerald-900/20"
              }`}>
                <div className="flex items-center justify-center gap-3">
                  {faceDetected === null ? (
                    <>
                      <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
                      <span className="font-semibold text-blue-700 light:text-blue-300">Memuat face detection...</span>
                    </>
                  ) : faceDetected ? (
                    <>
                      <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-semibold text-emerald-700 light:text-emerald-300">
                        ✨ Wajah terdeteksi ({faceCount} wajah) - Siap mengambil foto!
                      </span>
                    </>
                  ) : (
                    <>
                      <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="font-semibold text-amber-700 light:text-amber-300">Posisi Kamera hanya fokus ke salah satu area wajah</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Video Container */}
            <div className="relative mt-6 flex justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`hidden max-w-md rounded-2xl shadow-2xl ${cameraActive ? "!block" : ""}`}
                style={{ transform: "scaleX(-1)" }}
              />
              <canvas
                ref={overlayCanvasRef}
                className={`pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 ${cameraActive ? "block" : "hidden"}`}
                style={{ maxWidth: "448px", transform: "scaleX(-1)" }}
              />
            </div>

            <canvas ref={canvasRef} width={INPUT_SIZE} height={INPUT_SIZE} className="hidden" />

            {/* Preview Image */}
            {previewSrc && (
              <div className="mt-6 flex justify-center">
                <div className="relative overflow-hidden rounded-2xl shadow-2xl ring-4 ring-emerald-100 light:ring-emerald-900/30">
                  <Image
                    src={previewSrc}
                    alt="Preview"
                    width={400}
                    height={400}
                    unoptimized
                    className="max-w-md"
                    style={{ height: "auto" }}
                  />
                  {lastFaceDetected && !predictedTag && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <div className="rounded-2xl bg-emerald-500/90 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm">
                        ✓ Wajah Terdeteksi
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Predict Button */}
            <div className="mt-6 flex justify-center">
              <button
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-10 py-4 text-lg font-bold text-white shadow-2xl transition-all hover:scale-105 hover:shadow-emerald-500/50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                onClick={runPredict}
                disabled={!sessionReady || !previewSrc || isAnalyzing}
              >
                <span className="relative z-10 flex items-center gap-3">
                  {isAnalyzing ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Menganalisis...
                    </>
                  ) : (
                    <>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Prediksi Sekarang
                    </>
                  )}
                </span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"></div>
              </button>
            </div>
          </div>

          {/* Status Messages */}
          <div className="p-8">
            {sessionReady ? (
              resultHtml ? (
                <div className="result animate-fadeIn" dangerouslySetInnerHTML={{ __html: resultHtml }} />
              ) : !predictedTag ? (
                <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 light:border-emerald-800/40 light:from-emerald-900/20 light:to-teal-900/20">
                  <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-emerald-100 p-3 light:bg-emerald-900/40">
                      <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="mb-2 text-lg font-bold text-emerald-900 light:text-emerald-100">Model Siap Digunakan</h3>
                      <p className="text-emerald-700 light:text-emerald-300">
                        Upload gambar atau gunakan kamera, lalu tekan <span className="font-bold">Prediksi Sekarang</span> untuk memulai analisis.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null
            ) : (
              <div className="animate-pulse rounded-2xl border-2 border-blue-200 bg-blue-50 p-6 light:border-blue-800/40 light:bg-blue-900/20">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-blue-100 p-3 light:bg-blue-900/40">
                    <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-bold text-blue-900 light:text-blue-100">Memuat Model ONNX...</h3>
                    <p className="text-blue-700 light:text-blue-300">Menyiapkan sesi inferensi untuk prediksi yang lebih cepat.</p>
                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-blue-100 light:bg-blue-900/40">
                      <div className="h-full w-2/3 rounded-full bg-blue-500 transition-all duration-500"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hasil Prediksi & Rekomendasi */}
        {predictedTag && (
          <div className="mt-12 animate-fadeIn">
            <PredictionResult tag={predictedTag} confidence={predictionConfidence} />
            <Recommendations tag={predictedTag} />
          </div>
        )}
      </div>
    </main>
  )
}
