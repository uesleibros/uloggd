import { useRef, useEffect, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useGLTF, Environment, ContactShadows, OrbitControls } from "@react-three/drei"
import * as THREE from "three"

function ChestModel({ canOpen, chestState, onClick }) {
  const group = useRef()
  const { scene } = useGLTF("/models/Chest.glb")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!scene) return
    
    console.log("✅ Modelo carregado!")
    console.log("📦 Scene:", scene)
    
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    
    console.log("📏 Tamanho:", size)
    console.log("📍 Centro:", center)
    
    scene.traverse((child) => {
      console.log("  └─", child.name, child.type)
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    const maxDim = Math.max(size.x, size.y, size.z)
    if (maxDim > 5) {
      const scale = 2 / maxDim
      scene.scale.setScalar(scale)
      console.log("🔧 Escala ajustada:", scale)
    }

    scene.position.set(-center.x, -box.min.y, -center.z)
    
    setLoaded(true)
  }, [scene])

  useFrame((state, delta) => {
    if (!group.current) return
    if (canOpen && chestState === "idle") {
      group.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.05
    }
  })

  return (
    <group
      ref={group}
      onClick={onClick}
      onPointerOver={() => canOpen && (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "default")}
    >
      <primitive object={scene} />
      {canOpen && chestState === "idle" && (
        <pointLight position={[0, 0.5, 0.5]} color="#fbbf24" intensity={2} distance={3} />
      )}
    </group>
  )
}

function DebugHelper() {
  return (
    <>
      <axesHelper args={[2]} />
      <gridHelper args={[10, 10]} />
    </>
  )
}

export default function Chest3DCanvas({ canOpen, chestState, onClick }) {
  const [error, setError] = useState(null)

  return (
    <div className="w-32 h-32 sm:w-40 sm:h-40 relative">
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 text-red-400 text-xs p-2 text-center">
          {error}
        </div>
      )}
      <Canvas
        shadows
        camera={{ position: [0, 2, 4], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={() => console.log("🎬 Canvas criado")}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 3]} intensity={1} castShadow />
        
        <ChestModel canOpen={canOpen} chestState={chestState} onClick={onClick} />
        
        <DebugHelper />
        <OrbitControls enableZoom={true} enablePan={true} />
        <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={5} blur={2} />
        <Environment preset="city" />
      </Canvas>
    </div>
  )
}
