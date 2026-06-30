import type { AnimationContext, IAnimation } from '../core/IAnimation'

const theatreInitContextKey = Symbol('theatreInitContext')

export function withTheatreInitContext(instance: IAnimation, ctx: AnimationContext): IAnimation {
  Object.defineProperty(instance, theatreInitContextKey, {
    value: ctx,
    enumerable: false,
    writable: true,
    configurable: true,
  })
  return instance
}

export function resolveTheatreInitContext(instance: IAnimation, fallback: AnimationContext): AnimationContext {
  const bag = instance as IAnimation & { [theatreInitContextKey]?: AnimationContext }
  const ctx = bag[theatreInitContextKey] ?? fallback
  delete bag[theatreInitContextKey]
  return ctx
}
