/**
 * Latar partikel (panel biru halaman masuk & menu samping).
 *
 * Aturan ringannya dipertahankan dari aplikasi lama, dan alasannya masih
 * berlaku: halaman masuk sering dibuka dari HP sederhana di lapangan.
 *  1. Tidak dijalankan di layar ≤900px — di sana panel/menu memang tidak
 *     terlihat, jadi tidak ada kanvas, tidak ada requestAnimationFrame,
 *     tidak ada beban baterai.
 *  2. Menghormati `prefers-reduced-motion`.
 *  3. Tanpa interaktivitas: hover-repulse memaksa hitung jarak ke SETIAP
 *     partikel tiap frame, dan click-push menambah partikel tanpa henti.
 *  4. `retina_detect: false` — di layar 2x kanvasnya digambar 4x lebih banyak
 *     piksel; ini penghemat terbesar kedua setelah tidak jalan di HP.
 */

import { onBeforeUnmount } from 'vue'

type ParticlesFn = (id: string, config: Record<string, unknown>) => void

interface ParticlesWindow extends Window {
  particlesJS?: ParticlesFn
  pJSDom?: Array<{ pJS: { fn: { vendors: { destroypJS: () => void } } } }>
}

const CONFIG = (lineOpacity: number) => ({
  particles: {
    // 46 → sekitar 27 partikel nyata (density menghitung ulang dari luas
    // kanvas). Bukan 50: jumlah garis penghubung tumbuh kuadratik terhadap
    // jumlah partikel, jadi di sinilah biaya sebenarnya berada.
    number: { value: 46, density: { enable: true, value_area: 900 } },
    // Putih & emas mengikuti identitas SIMANTAP; warna bawaan particles.js
    // (ungu/hijau/merah) bertabrakan dengan panel navy.
    color: { value: ['#FFFFFF', '#FFDD87', '#F5B301'] },
    shape: { type: 'circle' },
    // random: false — dengan true, opacity diacak dari 0 sehingga sebagian
    // partikel nyaris tak terlihat dan keseluruhannya terkesan redup.
    opacity: { value: 0.8, random: false, anim: { enable: false } },
    size: { value: 2.6, random: true, anim: { enable: false } },
    line_linked: {
      enable: true, distance: 130, color: '#8FB6F0', opacity: lineOpacity, width: 1,
    },
    // Melayang pelan (1.1, bukan 6) supaya terasa tenang, bukan gelisah.
    move: {
      enable: true, speed: 1.1, direction: 'none', random: true,
      straight: false, out_mode: 'out', bounce: false,
    },
  },
  interactivity: {
    detect_on: 'canvas',
    events: { onhover: { enable: false }, onclick: { enable: false }, resize: true },
  },
  retina_detect: false,
})

let scriptPromise: Promise<void> | null = null

/** Muat particles.js sekali saja, dan hanya bila memang akan dipakai. */
function loadScript(): Promise<void> {
  scriptPromise ??= new Promise((resolve, reject) => {
    if ((window as ParticlesWindow).particlesJS) return resolve()
    const script = document.createElement('script')
    script.src = new URL('@/assets/particles.min.js', import.meta.url).href
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('particles.js gagal dimuat'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

function allowed(): boolean {
  return (
    window.matchMedia('(min-width: 901px)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function useParticles(elementId: string, lineOpacity = 0.34) {
  let running = false

  function destroy() {
    if (!running) return
    const scope = window as ParticlesWindow
    try {
      scope.pJSDom?.forEach((item) => item.pJS.fn.vendors.destroypJS())
      scope.pJSDom = []
    } catch {
      // Membersihkan kanvas hias bukan alasan untuk merusak halaman.
    }
    running = false
  }

  async function start() {
    if (running || !allowed() || !document.getElementById(elementId)) return
    try {
      await loadScript()
    } catch {
      return // Hiasan gagal dimuat; halaman tetap berfungsi penuh.
    }
    const particlesJS = (window as ParticlesWindow).particlesJS
    if (!particlesJS || !document.getElementById(elementId)) return
    particlesJS(elementId, CONFIG(lineOpacity))
    running = true
  }

  /**
   * Gambar ulang setelah wadahnya berubah lebar. particles.js mengunci lebar
   * kanvas saat dibuat dan tidak menyesuaikannya — kanvas 264px yang tertinggal
   * di dalam rail 76px membuat menu samping bisa digeser ke samping.
   */
  async function refresh() {
    destroy()
    await start()
  }

  onBeforeUnmount(destroy)

  return { start, destroy, refresh }
}
