import type AnimationBridge from '../controller/AnimationBridge'

const DEV_ENABLED = Boolean(
  (typeof import.meta !== 'undefined' && 'env' in import.meta && import.meta.env.DEV) ||
  window.location.search.includes('theatreDev=1') ||
  window.location.hostname.includes('localhost')
)

let panelElement: HTMLElement | null = null
let refreshTimer: number | null = null
let selectedIndex = 0

function createControl(label: string, value: string, onChange: (value: string) => void) {
  const row = document.createElement('div')
  row.className = 'flex items-center gap-2'
  const labelEl = document.createElement('label')
  labelEl.className = 'min-w-[7rem] text-[0.72rem] uppercase tracking-[0.16em] text-slate-300'
  labelEl.textContent = label
  const input = document.createElement('input')
  input.className = 'flex-1 rounded border border-white/15 bg-black/80 px-2 py-1 text-xs text-white outline-none focus:border-white/40'
  input.value = value
  input.addEventListener('change', () => onChange(input.value))
  row.append(labelEl, input)
  return row
}

function formatDebugValue(value: any) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function createTheatreDevPanel(overlay: HTMLElement, bridge: AnimationBridge) {
  if (!DEV_ENABLED || panelElement) return

  panelElement = document.createElement('aside')
  panelElement.className = 'theatre-dev-panel fixed top-4 left-4 z-70 max-h-[calc(100vh-3rem)] w-[22rem] overflow-hidden rounded-xl border border-white/15 bg-zinc-950/95 p-3 text-xs text-white shadow-2xl backdrop-blur'
  panelElement.style.pointerEvents = 'auto'

  const title = document.createElement('div')
  title.className = 'mb-3 flex items-center justify-between gap-3'
  title.innerHTML = '<strong class="text-sm">Theatre Dev</strong><span class="text-[0.65rem] text-slate-300">live script inspector</span>'

  const instanceSelect = document.createElement('select')
  instanceSelect.className = 'mb-3 w-full rounded border border-white/15 bg-black/80 px-2 py-1 text-xs text-white'
  instanceSelect.addEventListener('change', () => {
    selectedIndex = Number(instanceSelect.value)
    render()
  })

  const summaries = document.createElement('div')
  summaries.className = 'mb-3 space-y-2'

  const actionGroup = document.createElement('div')
  actionGroup.className = 'mb-3 flex flex-wrap gap-2'

  const restartBtn = document.createElement('button')
  restartBtn.textContent = 'Restart story'
  restartBtn.className = 'rounded bg-white/10 px-2 py-1 text-[0.8rem] text-white transition hover:bg-white/20'
  restartBtn.addEventListener('click', () => {
    const inst = bridge.getInstances()[selectedIndex] as any
    if (inst?.restartStory) inst.restartStory()
    render()
  })

  const applyBtn = document.createElement('button')
  applyBtn.textContent = 'Apply override'
  applyBtn.className = 'rounded bg-white/10 px-2 py-1 text-[0.8rem] text-white transition hover:bg-white/20'
  applyBtn.addEventListener('click', () => {
    const inst = bridge.getInstances()[selectedIndex] as any
    const poseInput = panelElement?.querySelector<HTMLInputElement>('input[name="poseHoldMs"]')
    const stemInput = panelElement?.querySelector<HTMLInputElement>('input[name="stemHoldMs"]')
    if (inst?.setScriptOverrides && poseInput && stemInput) {
      const poseHoldMs = Number(poseInput.value)
      const stemHoldMs = Number(stemInput.value)
      inst.setScriptOverrides({ poseHoldMs, stemHoldMs })
      render()
    }
  })

  actionGroup.append(restartBtn, applyBtn)

  const overridesSection = document.createElement('div')
  overridesSection.className = 'mb-3 space-y-2'
  overridesSection.append(
    createControl('Pose hold ms', '1200', value => {
      const input = panelElement?.querySelector<HTMLInputElement>('input[name="poseHoldMs"]')
      if (input) input.value = value
    }),
    createControl('Stem hold ms', '600', value => {
      const input = panelElement?.querySelector<HTMLInputElement>('input[name="stemHoldMs"]')
      if (input) input.value = value
    })
  )
  overridesSection.querySelectorAll('input').forEach((input, index) => {
    input.name = index === 0 ? 'poseHoldMs' : 'stemHoldMs'
  })

  const debugBox = document.createElement('pre')
  debugBox.className = 'min-h-[10rem] overflow-auto rounded border border-white/10 bg-black/90 p-2 text-[0.72rem] text-slate-200'
  debugBox.style.whiteSpace = 'pre-wrap'
  debugBox.style.wordBreak = 'break-word'

  panelElement.append(title, instanceSelect, summaries, actionGroup, overridesSection, debugBox)
  overlay.appendChild(panelElement)

  function render() {
    const instances = bridge.getInstances()
    instanceSelect.innerHTML = ''
    instances.forEach((inst, index) => {
      const name = inst.constructor?.name || `Layer ${index + 1}`
      const option = document.createElement('option')
      option.value = String(index)
      option.textContent = `${index + 1}. ${name}`
      if (index === selectedIndex) option.selected = true
      instanceSelect.appendChild(option)
    })

    summaries.innerHTML = ''
    instances.forEach((inst, index) => {
      const debugInst = inst as any
      const row = document.createElement('div')
      row.className = 'rounded border border-white/10 bg-white/5 p-2'
      const name = inst.constructor?.name || `Layer ${index + 1}`
      row.innerHTML = `<div class="text-[0.75rem] font-semibold text-white">${name}</div><div class="text-[0.68rem] text-slate-400">${debugInst?.getDebugState ? 'debuggable' : 'no debug state'}</div>`
      summaries.appendChild(row)
    })

    const selected = instances[selectedIndex] as any
    if (!selected) {
      debugBox.textContent = 'No current animation instance.'
      return
    }

    const debugState = typeof selected.getDebugState === 'function' ? selected.getDebugState() : undefined
    debugBox.textContent = formatDebugValue({
      type: selected.constructor?.name,
      debugState,
      hasRestartStory: Boolean(typeof selected.restartStory === 'function'),
      hasOverrides: Boolean(typeof selected.setScriptOverrides === 'function'),
      state: selected.state ?? null,
    })
  }

  render()
  refreshTimer = window.setInterval(render, 300)
}

export function destroyTheatreDevPanel() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
    refreshTimer = null
  }
  if (panelElement?.parentElement) panelElement.parentElement.removeChild(panelElement)
  panelElement = null
}
