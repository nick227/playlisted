import type { PuppetRig } from './rigTypes'

export const humanRig: PuppetRig = {
  id: 'default-human',
  label: 'Default Human Rig',
  joints: [
    { id: 'root', length: 0, angle: -90, radius: 10 },
    { id: 'hips', parent: 'root', length: 0, angle: 0, radius: 18 },
    { id: 'spine', parent: 'hips', length: 54, angle: -90, radius: 12 },
    { id: 'chest', parent: 'spine', length: 28, angle: -90, radius: 22 },
    { id: 'neck', parent: 'chest', length: 18, angle: -90, radius: 9 },
    { id: 'head', parent: 'neck', length: 24, angle: -90, radius: 22 },
    { id: 'leftShoulder', parent: 'chest', length: 24, angle: 190, radius: 8 },
    { id: 'leftElbow', parent: 'leftShoulder', length: 42, angle: -12, radius: 7 },
    { id: 'leftWrist', parent: 'leftElbow', length: 38, angle: -24, radius: 7 },
    { id: 'rightShoulder', parent: 'chest', length: 24, angle: -10, radius: 8 },
    { id: 'rightElbow', parent: 'rightShoulder', length: 42, angle: -88, radius: 7 },
    { id: 'rightWrist', parent: 'rightElbow', length: 38, angle: -76, radius: 7 },
    { id: 'leftHip', parent: 'hips', length: 20, angle: 150, radius: 9 },
    { id: 'leftKnee', parent: 'leftHip', length: 54, angle: 102, radius: 8 },
    { id: 'leftAnkle', parent: 'leftKnee', length: 54, angle: 88, radius: 7 },
    { id: 'rightHip', parent: 'hips', length: 20, angle: 30, radius: 9 },
    { id: 'rightKnee', parent: 'rightHip', length: 54, angle: 78, radius: 8 },
    { id: 'rightAnkle', parent: 'rightKnee', length: 54, angle: 92, radius: 7 },
    { id: 'eyes', parent: 'head', length: 0, angle: 0, radius: 3 },
    { id: 'mouth', parent: 'head', length: 0, angle: 0, radius: 3 },
    { id: 'brows', parent: 'head', length: 0, angle: 0, radius: 3 },
  ],
}

