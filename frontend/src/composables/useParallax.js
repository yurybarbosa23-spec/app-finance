import { ref, onMounted, onUnmounted } from 'vue'

export function useParallax() {
  const mx = ref(0)
  const my = ref(0)

  function onMove(e) {
    mx.value = (e.clientX / window.innerWidth - 0.5) * 2
    my.value = (e.clientY / window.innerHeight - 0.5) * 2
  }

  function tilt(n = 6) {
    return {
      transform: `perspective(900px) rotateX(${-my.value * n}deg) rotateY(${mx.value * n}deg) scale(1.01)`,
      transition: 'transform 0.4s cubic-bezier(.03,.98,.52,.99)'
    }
  }

  function glow() {
    const x = (mx.value + 1) * 50, y = (my.value + 1) * 50
    return { background: `radial-gradient(600px at ${x}% ${y}%, rgba(100,210,255,0.04), transparent 70%)` }
  }

  function globalGlow() {
    const x = (mx.value + 1) * 50, y = (my.value + 1) * 50
    return {
      background: `radial-gradient(circle at ${x}% ${y}%, rgba(10,132,255,0.06) 0%, rgba(0,0,0,0) 60%), var(--bg)`
    }
  }


  onMounted(() => window.addEventListener('mousemove', onMove))
  onUnmounted(() => window.removeEventListener('mousemove', onMove))

  return { mx, my, tilt, glow, globalGlow }
}
