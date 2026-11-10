/** Cubism WebGL shaders, embedded so nothing is fetched from disk (see runtime.ts). */
import alphablend from '../vendor/live2d/CubismWebFramework/Shaders/WebGL/fragshadersrcalphablend.frag'
import colorblend from '../vendor/live2d/CubismWebFramework/Shaders/WebGL/fragshadersrccolorblend.frag'
import copyFrag from '../vendor/live2d/CubismWebFramework/Shaders/WebGL/fragshadersrccopy.frag'
import maskInverted from '../vendor/live2d/CubismWebFramework/Shaders/WebGL/fragshadersrcmaskinvertedpremultipliedalpha.frag'
import mask from '../vendor/live2d/CubismWebFramework/Shaders/WebGL/fragshadersrcmaskpremultipliedalpha.frag'
import premultiplied from '../vendor/live2d/CubismWebFramework/Shaders/WebGL/fragshadersrcpremultipliedalpha.frag'
import premultipliedBlend from '../vendor/live2d/CubismWebFramework/Shaders/WebGL/fragshadersrcpremultipliedalphablend.frag'
import setupMaskFrag from '../vendor/live2d/CubismWebFramework/Shaders/WebGL/fragshadersrcsetupmask.frag'
import vert from '../vendor/live2d/CubismWebFramework/Shaders/WebGL/vertshadersrc.vert'
import vertBlend from '../vendor/live2d/CubismWebFramework/Shaders/WebGL/vertshadersrcblend.vert'
import vertCopy from '../vendor/live2d/CubismWebFramework/Shaders/WebGL/vertshadersrccopy.vert'
import vertMasked from '../vendor/live2d/CubismWebFramework/Shaders/WebGL/vertshadersrcmasked.vert'
import vertSetupMask from '../vendor/live2d/CubismWebFramework/Shaders/WebGL/vertshadersrcsetupmask.vert'

export const SHADER_SOURCES: Record<string, string> = {
  'fragshadersrcalphablend.frag': alphablend,
  'fragshadersrccolorblend.frag': colorblend,
  'fragshadersrccopy.frag': copyFrag,
  'fragshadersrcmaskinvertedpremultipliedalpha.frag': maskInverted,
  'fragshadersrcmaskpremultipliedalpha.frag': mask,
  'fragshadersrcpremultipliedalpha.frag': premultiplied,
  'fragshadersrcpremultipliedalphablend.frag': premultipliedBlend,
  'fragshadersrcsetupmask.frag': setupMaskFrag,
  'vertshadersrc.vert': vert,
  'vertshadersrcblend.vert': vertBlend,
  'vertshadersrccopy.vert': vertCopy,
  'vertshadersrcmasked.vert': vertMasked,
  'vertshadersrcsetupmask.vert': vertSetupMask,
}
