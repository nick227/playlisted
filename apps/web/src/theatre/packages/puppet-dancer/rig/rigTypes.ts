export type PuppetJointId =
  | 'root' | 'hips' | 'spine' | 'chest' | 'neck' | 'head'
  | 'leftShoulder' | 'leftElbow' | 'leftWrist'
  | 'rightShoulder' | 'rightElbow' | 'rightWrist'
  | 'leftHip' | 'leftKnee' | 'leftAnkle'
  | 'rightHip' | 'rightKnee' | 'rightAnkle'
  | 'eyes' | 'mouth' | 'brows'

export type RigJoint = {
  id: PuppetJointId
  parent?: PuppetJointId
  length: number
  angle: number
  radius?: number
}

export type PuppetRig = {
  id: string
  label: string
  joints: RigJoint[]
}

export type SolvedJoint = {
  id: PuppetJointId
  x: number
  y: number
  angle: number
  length: number
  radius: number
}

