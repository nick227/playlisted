import type { ResolvedPose } from '../poses/poseTypes'
import type { SolvedJoint } from '../rig/rigTypes'
import type { PuppetSkin } from '../skins/skinTypes'
import type { DancePlayer } from '../sequences/DancePlayer'
import type { TriggerFrame } from '../../../audio/VisualTriggers'
import type { DanceOption } from '../sequences'
import { layoutAutoDanceCheckbox, layoutDanceSelector } from './danceSelector'

export type PuppetDebugSnapshot = ReturnType<DancePlayer['getDebugState']> & {
  triggers: TriggerFrame | null
}

const limbs = [
  ['hips', 'spine'], ['spine', 'chest'], ['chest', 'neck'], ['neck', 'head'],
  ['chest', 'leftShoulder'], ['leftShoulder', 'leftElbow'], ['leftElbow', 'leftWrist'],
  ['chest', 'rightShoulder'], ['rightShoulder', 'rightElbow'], ['rightElbow', 'rightWrist'],
  ['hips', 'leftHip'], ['leftHip', 'leftKnee'], ['leftKnee', 'leftAnkle'],
  ['hips', 'rightHip'], ['rightHip', 'rightKnee'], ['rightKnee', 'rightAnkle'],
] as const

function line(ctx: CanvasRenderingContext2D, from: SolvedJoint, to: SolvedJoint, width: number) {
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
}

export class PuppetRenderer {
  constructor(private ctx: CanvasRenderingContext2D, private skin: PuppetSkin) {}

  drawStage(w: number, h: number, energy: number, lowPower: boolean, stageY = h * 0.78) {
    const g = this.ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#020617')
    g.addColorStop(0.58, '#111827')
    g.addColorStop(1, '#0f172a')
    this.ctx.fillStyle = g
    this.ctx.fillRect(0, 0, w, h)

    this.ctx.fillStyle = `rgba(34, 211, 238, ${0.08 + energy * 0.14})`
    this.ctx.beginPath()
    this.ctx.ellipse(w * 0.5, stageY, w * 0.22, h * 0.055, 0, 0, Math.PI * 2)
    this.ctx.fill()

    if (lowPower) return
    this.ctx.strokeStyle = `rgba(250, 204, 21, ${0.10 + energy * 0.14})`
    this.ctx.lineWidth = 1
    for (let i = 0; i < 5; i++) {
      const x = w * (0.18 + i * 0.16)
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(w * 0.5, stageY)
      this.ctx.stroke()
    }
  }

  drawPuppet(joints: Map<string, SolvedJoint>, pose: ResolvedPose, scale: number) {
    const p = this.skin.palette
    const get = (id: string) => joints.get(id) as SolvedJoint
    const strokeWidth = Math.max(3, 7 * scale)

    this.ctx.strokeStyle = p.shadow
    line(this.ctx, get('hips'), get('leftAnkle'), strokeWidth + 8)
    line(this.ctx, get('hips'), get('rightAnkle'), strokeWidth + 8)
    line(this.ctx, get('chest'), get('leftWrist'), strokeWidth + 8)
    line(this.ctx, get('chest'), get('rightWrist'), strokeWidth + 8)

    this.ctx.strokeStyle = p.line
    for (const [a, b] of limbs) line(this.ctx, get(a), get(b), strokeWidth)

    for (const joint of joints.values()) {
      if (joint.id === 'eyes' || joint.id === 'mouth' || joint.id === 'brows') continue
      this.ctx.fillStyle = joint.id === 'head' ? p.face : p.joint
      this.ctx.beginPath()
      this.ctx.arc(joint.x, joint.y, joint.radius, 0, Math.PI * 2)
      this.ctx.fill()
    }

    this.drawFace(get('head'), pose, scale)
  }

  drawDebug(joints: Map<string, SolvedJoint>, snapshot: PuppetDebugSnapshot, pose: ResolvedPose) {
    this.ctx.save()
    this.ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillStyle = 'rgba(248, 250, 252, 0.82)'
    this.ctx.strokeStyle = 'rgba(2, 6, 23, 0.8)'
    this.ctx.lineWidth = 3

    for (const joint of joints.values()) {
      if (joint.id === 'eyes' || joint.id === 'mouth' || joint.id === 'brows') continue
      const label = joint.id
      this.ctx.strokeText(label, joint.x + 7, joint.y - 7)
      this.ctx.fillText(label, joint.x + 7, joint.y - 7)
    }

    const triggers = snapshot.triggers
    const active = [
      triggers?.beat ? 'beat' : null,
      triggers?.bassHit ? 'bass' : null,
      triggers?.midsHit ? 'mids' : null,
      triggers?.highsHit ? 'highs' : null,
      triggers?.chaosHit ? 'chaos' : null,
    ].filter(Boolean).join(' ')
    const lines = [
      `${snapshot.sequenceLabel} / ${snapshot.poseLabel}`,
      `step ${snapshot.stepIndex}  t=${snapshot.stepElapsed}ms  accents=${snapshot.activeAccents}`,
      `triggers: ${active || '-'}`,
      `offset x=${pose.offset.x.toFixed(1)} y=${pose.offset.y.toFixed(1)} scale=${pose.scale.toFixed(2)}`,
      `face e=${pose.face.eyes.toFixed(2)} m=${pose.face.mouth.toFixed(2)} b=${pose.face.brows.toFixed(2)}`,
    ]

    const x = 14
    const y = 18
    const width = 310
    const height = lines.length * 18 + 14
    this.ctx.fillStyle = 'rgba(2, 6, 23, 0.72)'
    this.ctx.fillRect(x - 8, y - 9, width, height)
    this.ctx.fillStyle = '#f8fafc'
    lines.forEach((lineText, index) => this.ctx.fillText(lineText, x, y + index * 18))
    this.ctx.restore()
  }

  drawDanceSelector(width: number, height: number, options: DanceOption[], activeId: string, autoDance: boolean) {
    this.ctx.save()
    this.ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'

    const box = layoutAutoDanceCheckbox(width, height, options)
    this.ctx.beginPath()
    this.ctx.rect(box.x - box.size * 0.5, box.y - box.size * 0.5, box.size, box.size)
    this.ctx.fillStyle = autoDance ? 'rgba(34, 211, 238, 0.9)' : 'rgba(15, 23, 42, 0.78)'
    this.ctx.fill()
    this.ctx.lineWidth = 1.5
    this.ctx.strokeStyle = autoDance ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.42)'
    this.ctx.stroke()
    if (autoDance) {
      this.ctx.strokeStyle = '#0f172a'
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.moveTo(box.x - box.size * 0.22, box.y)
      this.ctx.lineTo(box.x - box.size * 0.03, box.y + box.size * 0.22)
      this.ctx.lineTo(box.x + box.size * 0.3, box.y - box.size * 0.25)
      this.ctx.stroke()
    }

    for (const circle of layoutDanceSelector(width, height, options)) {
      const active = circle.id === activeId
      this.ctx.beginPath()
      this.ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2)
      this.ctx.fillStyle = active ? 'rgba(250, 204, 21, 0.95)' : 'rgba(15, 23, 42, 0.78)'
      this.ctx.fill()
      this.ctx.lineWidth = active ? 2 : 1
      this.ctx.strokeStyle = active ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.36)'
      this.ctx.stroke()
      this.ctx.fillStyle = active ? '#0f172a' : '#f8fafc'
      this.ctx.fillText(circle.label.trim().charAt(0).toUpperCase(), circle.x, circle.y + 0.5)
    }

    this.ctx.restore()
  }

  private drawFace(head: SolvedJoint, pose: ResolvedPose, scale: number) {
    this.drawEyes(head, pose, scale)
    this.drawBrows(head, pose, scale)
    this.drawMouth(head, pose, scale)
  }

  private drawEyes(head: SolvedJoint, pose: ResolvedPose, scale: number) {
    const eyeOpen = Math.max(0, Math.min(1, pose.face.eyeOpen))
    const eyeY = head.y - 5 * scale
    const eyeR = 4.4 * scale
    const pupilR = 1.45 * scale
    const pupilLimit = eyeR * 0.44
    const pupilDx = pose.face.pupilX * pupilLimit
    const pupilDy = pose.face.pupilY * pupilLimit * 0.75

    for (const side of [-1, 1]) {
      const cx = head.x + side * 7.2 * scale
      this.ctx.save()
      this.ctx.beginPath()
      this.ctx.arc(cx, eyeY, eyeR, 0, Math.PI * 2)
      this.ctx.fillStyle = '#f8fafc'
      this.ctx.fill()
      this.ctx.strokeStyle = '#0f172a'
      this.ctx.lineWidth = Math.max(1, 1.2 * scale)
      this.ctx.stroke()

      this.ctx.beginPath()
      this.ctx.arc(cx, eyeY, eyeR * 0.88, 0, Math.PI * 2)
      this.ctx.clip()
      if (eyeOpen > 0.16) {
        this.ctx.beginPath()
        this.ctx.arc(cx + pupilDx, eyeY + pupilDy, pupilR, 0, Math.PI * 2)
        this.ctx.fillStyle = '#020617'
        this.ctx.fill()
      }

      const lidH = eyeR * (1 - eyeOpen)
      if (lidH > 0.01) {
        this.ctx.fillStyle = this.skin.palette.face
        this.ctx.fillRect(cx - eyeR - 1, eyeY - eyeR - 1, eyeR * 2 + 2, lidH * 1.4)
        this.ctx.fillRect(cx - eyeR - 1, eyeY + eyeR - lidH * 1.4, eyeR * 2 + 2, lidH * 1.4 + 1)
      }
      this.ctx.restore()

      if (eyeOpen < 0.18) {
        this.ctx.strokeStyle = '#0f172a'
        this.ctx.lineWidth = Math.max(1, 1.5 * scale)
        this.ctx.beginPath()
        this.ctx.moveTo(cx - eyeR * 0.72, eyeY)
        this.ctx.lineTo(cx + eyeR * 0.72, eyeY)
        this.ctx.stroke()
      }
    }
  }

  private drawBrows(head: SolvedJoint, pose: ResolvedPose, scale: number) {
    this.ctx.strokeStyle = '#0f172a'
    this.ctx.lineWidth = Math.max(1.2, 1.8 * scale)
    this.ctx.lineCap = 'round'
    for (const side of [-1, 1]) {
      const lift = side < 0 ? pose.face.leftBrowLift : pose.face.rightBrowLift
      const rotate = side < 0 ? pose.face.leftBrowRotate : pose.face.rightBrowRotate
      const cx = head.x + side * 7.2 * scale
      const cy = head.y - (12.5 + lift * 4.5) * scale
      const len = 7 * scale
      const angle = rotate + side * 0.08
      const dx = Math.cos(angle) * len * 0.5
      const dy = Math.sin(angle) * len * 0.5
      this.ctx.beginPath()
      this.ctx.moveTo(cx - dx, cy - dy)
      this.ctx.lineTo(cx + dx, cy + dy)
      this.ctx.stroke()
    }
  }

  private drawMouth(head: SolvedJoint, pose: ResolvedPose, scale: number) {
    const p = this.skin.palette
    const open = Math.max(0, Math.min(1, pose.face.mouthOpen))
    const smile = Math.max(-0.8, Math.min(1, pose.face.mouthSmile))
    const centerX = head.x
    const centerY = head.y + 8.2 * scale
    const mouthW = (8 + open * 5) * scale
    const topY = centerY + (pose.face.topLipY * 1.8 - open * 1.6) * scale
    const bottomY = centerY + (2.5 + pose.face.bottomLipY * 2.2 + open * 5.2) * scale
    const cornerY = centerY - smile * 2.5 * scale + open * 1.4 * scale

    if (open > 0.18) {
      this.ctx.fillStyle = '#25020b'
      this.ctx.beginPath()
      this.ctx.moveTo(centerX - mouthW, cornerY)
      this.ctx.quadraticCurveTo(centerX, topY - 1 * scale, centerX + mouthW, cornerY)
      this.ctx.quadraticCurveTo(centerX, bottomY + 1.5 * scale, centerX - mouthW, cornerY)
      this.ctx.fill()
    }

    if (pose.face.tongue > 0.08 && open > 0.34) {
      const tongue = pose.face.tongue
      this.ctx.fillStyle = '#fb7185'
      this.ctx.beginPath()
      this.ctx.ellipse(centerX, bottomY - 1.4 * scale, mouthW * 0.42, 4.5 * scale * tongue, 0, Math.PI, 0)
      this.ctx.fill()
    }

    this.ctx.strokeStyle = p.accent
    this.ctx.lineWidth = Math.max(1.4, 2 * scale)
    this.ctx.lineCap = 'round'
    this.ctx.beginPath()
    this.ctx.moveTo(centerX - mouthW, cornerY)
    this.ctx.quadraticCurveTo(centerX, topY - 2.2 * scale, centerX + mouthW, cornerY)
    this.ctx.stroke()

    this.ctx.beginPath()
    this.ctx.moveTo(centerX - mouthW * 0.92, cornerY + 0.4 * scale)
    this.ctx.quadraticCurveTo(centerX, bottomY, centerX + mouthW * 0.92, cornerY + 0.4 * scale)
    this.ctx.stroke()
  }
}
