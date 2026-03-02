import { useRef, useState, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, Environment, ContactShadows } from "@react-three/drei"
import * as THREE from "three"

function ChestModel({ canOpen, chestState, onClick }) {
  const group = useRef()
  const lidRef = useRef()
  const { scene, nodes } = useGLTF("/models/Chest.glb")
  const [hovered, setHovered] = useState(false)
  const lidAngle = useRef(0)
  const shakeTime = useRef(0)
  const floatTime = useRef(0)
  const glowIntensity = useRef(0)

  useFrame((state, delta) => {
    if (!group.current) return

    if (chestState === "shaking") {
      shakeTime.current += delta * 40
      group.current.rotation.z = Math.sin(shakeTime.current) * 0.08
      group.current.position.x = Math.sin(shakeTime.current * 1.3) * 0.02
    } else {
      shakeTime.current = 0
      group.current.rotation.z = THREE.MathUtils.lerp(group.current.rotation.z, 0, 0.1)
      group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, 0, 0.1)
    }

    if (canOpen && chestState === "idle") {
      floatTime.current += delta
      group.current.position.y = Math.sin(floatTime.current * 1.5) * 0.05
      glowIntensity.current = THREE.MathUtils.lerp(glowIntensity.current, 1, 0.05)
    } else {
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, 0, 0.1)
    }

    if (chestState === "opening" || chestState === "burst") {
      lidAngle.current = THREE.MathUtils.lerp(lidAngle.current, -Math.PI * 0.65, 0.08)
    } else {
      lidAngle.current = THREE.MathUtils.lerp(lidAngle.current, 0, 0.1)
    }

    if (lidRef.current) {
      lidRef.current.rotation.x = lidAngle.current
    }

    if (hovered && canOpen) {
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        Math.sin(state.clock.elapsedTime * 2) * 0.05,
        0.1
      )
    }
  })

  useEffect(() => {
    if (!scene) return
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        if (!canOpen) {
          child.material = child.material.clone()
          child.material.color.set("#666666")
          child.material.metalness = 0.3
        }
      }
    })
  }, [scene, canOpen])

  const lid = nodes?.lid || nodes?.Lid || nodes?.tampa || null
  const body = nodes?.body || nodes?.Body || nodes?.corpo || null

  if (lid && body) {
    return (
      <group
        ref={group}
        onClick={onClick}
        onPointerOver={() => {
          setHovered(true)
          if (canOpen) document.body.style.cursor = "pointer"
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = "default"
        }}
        scale={hovered && canOpen ? 1.05 : 1}
      >
        <primitive object={body} />
        <group ref={lidRef} position={[0, body.geometry?.boundingBox?.max?.y || 0.5, 0]}>
          <primitive object={lid} />
        </group>

        {(chestState === "opening" || chestState === "burst") && (
          <pointLight
            position={[0, 0.5, 0]}
            color="#fbbf24"
            intensity={chestState === "burst" ? 15 : 8}
            distance={3}
          />
        )}

        {canOpen && chestState === "idle" && (
          <pointLight
            position={[0, 0.3, 0.5]}
            color="#fbbf24"
            intensity={2}
            distance={2}
          />
        )}
      </group>
    )
  }

  return (
    <group
      ref={group}
      onClick={onClick}
      onPointerOver={() => {
        setHovered(true)
        if (canOpen) document.body.style.cursor = "pointer"
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = "default"
      }}
      scale={hovered && canOpen ? 1.05 : 1}
    >
      <primitive object={scene} />

      {(chestState === "opening" || chestState === "burst") && (
        <pointLight
          position={[0, 0.5, 0]}
          color="#fbbf24"
          intensity={chestState === "burst" ? 15 : 8}
          distance={3}
        />
      )}

      {canOpen && chestState === "idle" && (
        <pointLight
          position={[0, 0.3, 0.5]}
          color="#fbbf24"
          intensity={2}
          distance={2}
        />
      )}
    </group>
  )
}

function Particles({ active }) {
  const ref = useRef()
  const count = 20
  const positions = useRef(new Float32Array(count * 3))
  const velocities = useRef([])

  useEffect(() => {
    if (active) {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2
        const speed = 0.5 + Math.random() * 1.5
        velocities.current[i] = {
          x: Math.cos(angle) * speed * 0.02,
          y: (0.5 + Math.random()) * 0.03,
          z: Math.sin(angle) * speed * 0.02,
        }
        positions.current[i * 3] = 0
        positions.current[i * 3 + 1] = 0.3
        positions.current[i * 3 + 2] = 0
      }
    }
  }, [active])

  useFrame(() => {
    if (!active || !ref.current) return
    const pos = ref.current.geometry.attributes.position
    for (let i = 0; i < count; i++) {
      pos.array[i * 3] += velocities.current[i]?.x || 0
      pos.array[i * 3 + 1] += velocities.current[i]?.y || 0
      pos.array[i * 3 + 2] += velocities.current[i]?.z || 0
      if (velocities.current[i]) {
        velocities.current[i].y -= 0.001
      }
    }
    pos.needsUpdate = true
  })

  if (!active) return null

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions.current}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#fbbf24" transparent opacity={0.8} />
    </points>
  )
}

export default function Chest3DCanvas({ canOpen, chestState, onClick }) {
  return (
    <div className="w-32 h-32 sm:w-40 sm:h-40">
      <Canvas
        shadows
        camera={{ position: [0, 0.8, 2], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[2, 3, 2]} intensity={1.2} castShadow />
        <directionalLight position={[-1, 2, -1]} intensity={0.3} />

        <ChestModel canOpen={canOpen} chestState={chestState} onClick={onClick} />
        <Particles active={chestState === "burst"} />

        <ContactShadows
          position={[0, -0.5, 0]}
          opacity={0.4}
          scale={3}
          blur={2}
          far={2}
        />

        <Environment preset="city" />
      </Canvas>
    </div>
  )
}

useGLTF.preload("/models/chest.glb")
