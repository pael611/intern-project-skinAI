import { 
  CpuChipIcon, 
  ShieldCheckIcon, 
  SparklesIcon, 
  CommandLineIcon 
} from '@heroicons/react/24/outline'

export default function AboutPage() {
  const features = [
    {
      name: 'Teknologi AI On-Device',
      description: 'Menggunakan ONNX Runtime Web untuk menjalankan model machine learning langsung di browser Anda tanpa lag.',
      icon: CpuChipIcon,
      color: 'bg-emerald-100 text-emerald-600',
    },
    {
      name: 'Privasi Terjamin',
      description: 'Gambar wajah Anda tidak pernah dikirim atau disimpan di server kami. Semua analisis diproses secara lokal.',
      icon: ShieldCheckIcon,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      name: 'Rekomendasi Cerdas',
      description: 'Memberikan saran produk yang dipersonalisasi berdasarkan dataset lokal yang telah dikurasi secara mendalam.',
      icon: SparklesIcon,
      color: 'bg-amber-100 text-amber-600',
    },
    {
      name: 'Modern Tech Stack',
      description: 'Dibangun dengan Next.js App Router, TypeScript, dan Tailwind CSS untuk performa yang optimal.',
      icon: CommandLineIcon,
      color: 'bg-purple-100 text-purple-600',
    },
  ]

  return (
    <main className="min-h-screen bg-[#f8fafc] py-16 px-4">
      <div className="mx-auto max-w-5xl">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm border border-emerald-100">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Our Mission</span>
          </div>
          <h1 className="text-4xl font-extrabold text-neutral-900 sm:text-5xl">
            Tentang <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">SkinAI</span>
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-lg text-neutral-600 leading-relaxed">
            SkinAI adalah platform inovatif yang menggabungkan kecerdasan buatan dengan perawatan kulit. Kami percaya bahwa setiap orang berhak mendapatkan analisis kulit yang akurat, cepat, dan privat.
          </p>
        </div>

        {/* Grid Features */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:gap-12">
          {features.map((feature) => (
            <div key={feature.name} className="relative group overflow-hidden rounded-[2rem] border border-neutral-100 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className={`inline-flex rounded-2xl p-3 mb-6 ${feature.color}`}>
                <feature.icon className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-3">{feature.name}</h3>
              <p className="text-neutral-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Technical Stack Card */}
        <div className="mt-16 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-white shadow-2xl md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Bagaimana ini bekerja?</h2>
              <p className="text-emerald-50 leading-relaxed mb-6">
                Aplikasi ini mengambil data produk dari dataset lokal <code className="bg-white/10 px-2 py-1 rounded">treatment.json</code> dan mencocokkannya dengan hasil inferensi model ONNX yang berjalan seketika setelah Anda mengambil foto wajah.
              </p>
              <div className="flex flex-wrap gap-3">
                {['Next.js', 'ONNX', 'Tailwind', 'TypeScript'].map((tech) => (
                  <span key={tech} className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-semibold">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden md:block">
               {/* Dekorasi visual sederhana */}
               <div className="relative h-48 w-full border-2 border-dashed border-white/30 rounded-3xl flex items-center justify-center">
                  <CommandLineIcon className="h-24 w-24 text-white/20" />
                  <div className="absolute -top-4 -left-4 h-12 w-12 bg-emerald-400 rounded-full blur-xl opacity-50"></div>
                  <div className="absolute -bottom-4 -right-4 h-12 w-12 bg-teal-300 rounded-full blur-xl opacity-50"></div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}