import { useRef, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, useAnimations, Environment, ContactShadows } from "@react-three/drei"
import * as THREE from "three"

function MinecraftChest({ canOpen, chestState, onClick }) {
  const group = useRef()
  const glowRef = useRef()
  const { scene, animations } = useGLTF("/models/Chest.glb")
  const { actions, mixer } = useAnimations(animations, group)
  const shakeTime = useRef(0)
  const isAnimating = useRef(false)

  useEffect(() => {
    if (!scene) return

    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 1.8 / maxDim

    scene.scale.setScalar(scale)
    scene.position.set(
      -center.x * scale,
      -box.min.y * scale,
      -center.z * scale
    )

    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        if (child.material) {
          child.material.roughness = 1
          child.material.metalness = 0
        }
      }
    })

    if (!canOpen && scene) {
      scene.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone()
          child.material.color.multiplyScalar(0.3)
          child.material.needsUpdate = true
        }
      })
    }
  }, [scene, canOpen])

  useEffect(() => {
    if (!actions || !mixer) return

    const openAction = actions["Chest_0_A|Chest_0_AAction"]
    if (!openAction) return

    openAction.setLoop(THREE.LoopOnce, 1)
    openAction.clampWhenFinished = true
    openAction.timeScale = 1.5

    if (chestState === "opening" || chestState === "burst") {
      if (!isAnimating.current) {
        openAction.reset()
        openAction.play()
        isAnimating.current = true
      }
    } else if (chestState === "idle" && isAnimating.current) {
      openAction.timeScale = -2
      openAction.paused = false
      openAction.play()
      setTimeout(() => {
        isAnimating.current = false
      }, 500)
    }
  }, [chestState, actions, mixer])

  useFrame((state, delta) => {
    if (!group.current) return

    if (mixer) mixer.update(delta)

    if (chestState === "shaking") {
      shakeTime.current += delta * 40
      group.current.rotation.z = Math.sin(shakeTime.current) * 0.1
      group.current.rotation.x = Math.cos(shakeTime.current * 1.2) * 0.05
      group.current.position.x = Math.sin(shakeTime.current * 1.5) * 0.04
      group.current.position.y = Math.abs(Math.sin(shakeTime.current * 0.8)) * 0.05
    } else {
      shakeTime.current = 0
      group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, 0, 0.1)
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, 0, 0.1)
      group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, 0, 0.1)

      if (canOpen && chestState === "idle") {
        group.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.08
        group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.05
      } else {
        group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, 0, 0.1)
        group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, 0, 0.05)
      }
    }

    if (glowRef.current) {
      if (chestState === "opening") {
        glowRef.current.intensity = THREE.MathUtils.lerp(glowRef.current.intensity, 15, 0.12)
      } else if (chestState === "burst") {
        glowRef.current.intensity = THREE.MathUtils.lerp(glowRef.current.intensity, 30, 0.2)
      } else if (canOpen && chestState === "idle") {
        glowRef.current.intensity = 3 + Math.sin(state.clock.elapsedTime * 2.5) * 2
      } else {
        glowRef.current.intensity = THREE.MathUtils.lerp(glowRef.current.intensity, 0, 0.1)
      }
    }
  })

  return (
    <group
      ref={group}
      onClick={() => canOpen && onClick?.()}
      onPointerOver={() => canOpen && (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "default")}
    >
      <primitive object={scene} />
      <pointLight
        ref={glowRef}
        position={[0, 0.9, 0]}
        color="#fbbf24"
        intensity={0}
        distance={5}
        decay={2}
      />
    </group>
  )
}

function Particles({ active }) {
  const meshRef = useRef()
  const count = 25
  const dummy = useRef(new THREE.Object3D())
  const particles = useRef([])

  useEffect(() => {
    if (!active || !meshRef.current) return

    particles.current = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const speed = 0.8 + Math.random() * 1.5
      particles.current.push({
        position: new THREE.Vector3(0, 0.7, 0),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed * 0.018,
          (0.8 + Math.random() * 1.2) * 0.028,
          Math.sin(angle) * speed * 0.018
        ),
        scale: 0.025 + Math.random() * 0.025,
        life: 1,
      })
    }
  }, [active])

  useFrame(() => {
    if (!active || !meshRef.current || particles.current.length === 0) return

    for (let i = 0; i < count; i++) {
      const p = particles.current[i]
      if (!p) continue

      p.position.add(p.velocity)
      p.velocity.y -= 0.0012
      p.life -= 0.011

      const scale = Math.max(0, p.life) * p.scale
      dummy.current.position.copy(p.position)
      dummy.current.scale.setScalar(scale)
      dummy.current.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.current.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  if (!active) return null

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#f59e0b"
        emissiveIntensity={2.5}
        toneMapped={false}
      />
    </instancedMesh>
  )
}

export default function Chest3DCanvas({ canOpen, chestState, onClick }) {
  return (
    <div className="w-32 h-32 sm:w-40 sm:h-40">
      <Canvas
        shadows
        camera={{ position: [0, 1.3, 3], fov: 32 }}
        gl={{ antialias: false, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 5, 3]} intensity={1.4} castShadow />
        <directionalLight position={[-2, 3, -2]} intensity={0.5} />

        <MinecraftChest canOpen={canOpen} chestState={chestState} onClick={onClick} />
        <Particles active={chestState === "burst"} />

        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.45}
          scale={3}
          blur={2.2}
          far={2}
        />
        <Environment preset="city" />
      </Canvas>
    </div>
  )
}

useGLTF.preload("/models/chest.glb")
