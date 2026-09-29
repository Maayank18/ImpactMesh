import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import ForceGraph3D from 'react-force-graph-3d'
import * as THREE from 'three'
import type { GraphLink, GraphNode, GraphPayload } from '@impactmesh/shared-types'
import { useTheme } from '@/stores/theme'
import type { LayerVisibility } from './canvas-layers'

export interface GraphHandle {
  zoomToFit: () => void
  flyTo: (id: string) => void
  zoom: (direction: 1 | -1) => void
  unpin: (id: string) => void
  camera: () => any
}

const COLORS: Record<string, string> = {
  organization: '#f4f0e6',
  project: '#5ee0b5',
  location: '#e4b15a',
  activity: '#8eb7ff',
  media: '#5ee0b5',
  report: '#f0d7b0',
  partner: '#c4b5fd',
  evidence_set: '#7ddec8',
  category: '#c084fc',
  tag: '#8a847b',
}

// -----------------------------------------------------------------------------
// TEXTURE & SPRITE CACHING POOL (prevents allocating 500+ canvases on every render)
// -----------------------------------------------------------------------------
const textures = new Map<string, THREE.Texture>()
const loader = new THREE.TextureLoader()
loader.setCrossOrigin('anonymous')

function textureFor(url: string) {
  const cached = textures.get(url)
  if (cached) return cached
  const texture = loader.load(url, () => {
    texture.needsUpdate = true
  })
  texture.colorSpace = THREE.SRGBColorSpace
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  textures.set(url, texture)
  return texture
}

const labelTextureCache = new Map<string, THREE.CanvasTexture>()

function getLabelTexture(text: string, nodeType: string, selected = false, badgeText?: string): THREE.CanvasTexture {
  const key = `${text}_${nodeType}_${selected ? 1 : 0}_${badgeText || ''}`
  const cached = labelTextureCache.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 100
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  const label = text.length > 24 ? text.slice(0, 22) + '…' : text
  const color = COLORS[nodeType] || '#f4f0e6'

  const pillWidth = Math.min(480, Math.max(200, label.length * 13 + (badgeText ? 110 : 50)))
  const pillHeight = 52
  const x = (canvas.width - pillWidth) / 2
  const y = (canvas.height - pillHeight) / 2
  const r = 26

  ctx.beginPath()
  ctx.roundRect(x, y, pillWidth, pillHeight, r)
  ctx.fillStyle = selected ? 'rgba(8, 14, 20, 0.96)' : 'rgba(6, 9, 13, 0.88)'
  ctx.fill()
  ctx.lineWidth = selected ? 2.5 : 1.2
  ctx.strokeStyle = selected ? '#5ee0b5' : 'rgba(255, 255, 255, 0.16)'
  ctx.stroke()

  // Glowing category indicator pip
  ctx.beginPath()
  ctx.arc(x + 22, y + pillHeight / 2, 5.5, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = selected ? 10 : 5
  ctx.fill()
  ctx.shadowBlur = 0

  ctx.font = '600 22px "Instrument Sans", system-ui, sans-serif'
  ctx.fillStyle = selected ? '#ffffff' : '#f4f0e6'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + 38, y + pillHeight / 2)

  if (badgeText) {
    const badgeX = x + pillWidth - 44
    ctx.font = '700 16px "DM Mono", monospace'
    ctx.fillStyle = '#5ee0b5'
    ctx.textAlign = 'center'
    ctx.fillText(badgeText, badgeX, y + pillHeight / 2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  labelTextureCache.set(key, texture)
  return texture
}

function labelSprite(text: string, nodeType: string, selected = false, badgeText?: string) {
  const texture = getLabelTexture(text, nodeType, selected, badgeText)
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  )
  sprite.scale.set(20, 3.9, 1)
  sprite.position.set(0, 9, 0)
  return sprite
}

// -----------------------------------------------------------------------------
// GEOMETRY & MATERIAL POOL (Shared singletons to eliminate 1500+ allocations)
// -----------------------------------------------------------------------------
const GEOMETRIES = {
  sphere: new THREE.SphereGeometry(1, 16, 14),
  octahedron: new THREE.OctahedronGeometry(1.1),
  cone: new THREE.ConeGeometry(0.85, 1.85, 6),
  box: new THREE.BoxGeometry(1.4, 1.7, 0.45),
  card: new THREE.BoxGeometry(16, 11, 0.6),
  cardEdges: new THREE.EdgesGeometry(new THREE.BoxGeometry(16.3, 11.3, 0.7)),
  cardHalo: new THREE.RingGeometry(16 * 0.62, 16 * 0.72, 24),
  icosahedron: new THREE.IcosahedronGeometry(0.95, 0),
  dodecahedron: new THREE.DodecahedronGeometry(1.05),
  tag: new THREE.SphereGeometry(0.6, 10, 10),
  projectRing1: new THREE.RingGeometry(1.5, 1.65, 32),
  projectRing2: new THREE.RingGeometry(1.9, 2.0, 32),
  projectShell: new THREE.SphereGeometry(1.15, 16, 16),
  orgRing: new THREE.RingGeometry(1.4, 1.55, 32),
  locationRing: new THREE.RingGeometry(1.25, 1.4, 24),
  locationRing2: new THREE.RingGeometry(1.6, 1.72, 24),
  selectionHalo: new THREE.RingGeometry(1.55, 1.72, 28),
}

const materialCache = new Map<string, THREE.Material>()

function getStandardMaterial(colorHex: string, selected: boolean, isProject: boolean, isDimmed: boolean): THREE.MeshStandardMaterial {
  const key = `std_${colorHex}_${selected ? 1 : 0}_${isProject ? 1 : 0}_${isDimmed ? 1 : 0}`
  let mat = materialCache.get(key) as THREE.MeshStandardMaterial | undefined
  if (!mat) {
    const col = new THREE.Color(isDimmed ? '#1a1d24' : colorHex)
    mat = new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.35,
      metalness: 0.1,
      emissive: selected ? col : isProject ? col : new THREE.Color(0x000000),
      emissiveIntensity: selected ? 0.65 : isProject ? 0.3 : 0.05,
    })
    materialCache.set(key, mat)
  }
  return mat
}

function getBasicMaterial(colorHex: number | string, opacity: number, wireframe = false): THREE.MeshBasicMaterial {
  const key = `basic_${colorHex}_${opacity}_${wireframe ? 1 : 0}`
  let mat = materialCache.get(key) as THREE.MeshBasicMaterial | undefined
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({
      color: typeof colorHex === 'string' ? new THREE.Color(colorHex) : colorHex,
      side: THREE.DoubleSide,
      transparent: opacity < 1,
      opacity,
      wireframe,
    })
    materialCache.set(key, mat)
  }
  return mat
}

export type LiveNode = GraphNode & {
  x?: number
  y?: number
  z?: number
  fx?: number
  fy?: number
  fz?: number
  imageUrl?: string
  clusterCount?: number
  isCollapsed?: boolean
  __threeGroup?: THREE.Group
  __stateKey?: string
}

function objectFor(node: LiveNode, showLabels: boolean, selected: boolean, dimmed: boolean) {
  const group = new THREE.Group()
  const baseColor = node.color || COLORS[node.type] || '#f4f0e6'
  const radius = Math.max(3.5, (node.size || 7) * 0.44)

  // 1. MEDIA NODES: 3D Photo Card
  if (node.type === 'media' && node.imageUrl) {
    const cardWidth = 16
    const cardHeight = 11

    const photoMat = new THREE.MeshBasicMaterial({
      map: textureFor(node.imageUrl),
      transparent: false,
    })
    const borderMat = getStandardMaterial(selected ? '#5ee0b5' : dimmed ? '#22262e' : '#2a303c', selected, false, dimmed)

    const cardMesh = new THREE.Mesh(GEOMETRIES.card, [
      borderMat,
      borderMat,
      borderMat,
      borderMat,
      photoMat,
      borderMat,
    ])
    group.add(cardMesh)

    // Frame
    const frameMat = new THREE.LineBasicMaterial({
      color: selected ? 0x5ee0b5 : 0x8892a0,
      transparent: true,
      opacity: selected ? 0.9 : 0.4,
    })
    group.add(new THREE.LineSegments(GEOMETRIES.cardEdges, frameMat))

    if (selected) {
      const halo = new THREE.Mesh(GEOMETRIES.cardHalo, getBasicMaterial(0x5ee0b5, 0.5))
      group.add(halo)
    }

    if (showLabels || selected) {
      const sprite = labelSprite(node.label || 'Media Asset', node.type, selected)
      if (sprite) {
        sprite.position.set(0, cardHeight * 0.6 + 4.5, 0)
        group.add(sprite)
      }
    }

    return group
  }

  // 2. STANDARD / GEOMETRIC NODES
  const isProject = node.type === 'project'
  const material = getStandardMaterial(baseColor, selected, isProject, dimmed)

  let geom: THREE.BufferGeometry = GEOMETRIES.sphere
  if (node.type === 'location') geom = GEOMETRIES.octahedron
  else if (node.type === 'activity') geom = GEOMETRIES.cone
  else if (node.type === 'report') geom = GEOMETRIES.box
  else if (node.type === 'partner') geom = GEOMETRIES.icosahedron
  else if (node.type === 'evidence_set') geom = GEOMETRIES.dodecahedron
  else if (node.type === 'category') geom = GEOMETRIES.dodecahedron
  else if (node.type === 'tag') geom = GEOMETRIES.tag

  const mainMesh = new THREE.Mesh(geom, material)
  mainMesh.scale.set(radius, radius, radius)
  group.add(mainMesh)

  // Dynamic Category Cluster Halo
  if (node.type === 'category') {
    const ringColor = node.color ? parseInt(node.color.replace('#', '0x'), 16) : 0xc084fc
    const catRing = new THREE.Mesh(GEOMETRIES.projectRing1, getBasicMaterial(ringColor, selected ? 0.85 : 0.45))
    catRing.scale.set(radius * 1.15, radius * 1.15, radius * 1.15)
    catRing.rotation.x = Math.PI / 3.2
    group.add(catRing)

    const catRing2 = new THREE.Mesh(GEOMETRIES.projectRing2, getBasicMaterial(ringColor, selected ? 0.6 : 0.25))
    catRing2.scale.set(radius * 1.15, radius * 1.15, radius * 1.15)
    catRing2.rotation.x = -Math.PI / 4
    group.add(catRing2)
  }

  // Planetary Orbit Rings for Projects
  if (isProject) {
    const ring1 = new THREE.Mesh(GEOMETRIES.projectRing1, getBasicMaterial(0x5ee0b5, selected ? 0.85 : 0.45))
    ring1.scale.set(radius, radius, radius)
    ring1.rotation.x = Math.PI / 3.2
    group.add(ring1)

    const ring2 = new THREE.Mesh(GEOMETRIES.projectRing2, getBasicMaterial(0x5ee0b5, selected ? 0.6 : 0.2))
    ring2.scale.set(radius, radius, radius)
    ring2.rotation.x = -Math.PI / 4
    group.add(ring2)

    const shell = new THREE.Mesh(GEOMETRIES.projectShell, getBasicMaterial(0x5ee0b5, selected ? 0.45 : 0.15, true))
    shell.scale.set(radius, radius, radius)
    group.add(shell)
  }

  // Organization Nexus Halo
  if (node.type === 'organization') {
    const orgRing = new THREE.Mesh(GEOMETRIES.orgRing, getBasicMaterial(0xf4f0e6, 0.4))
    orgRing.scale.set(radius, radius, radius)
    orgRing.rotation.x = Math.PI / 2
    group.add(orgRing)
  }

  // Location Beacon Halos (dual GPS radar rings)
  if (node.type === 'location') {
    const locRing = new THREE.Mesh(GEOMETRIES.locationRing, getBasicMaterial(0xe4b15a, 0.45))
    locRing.scale.set(radius, radius, radius)
    locRing.rotation.x = Math.PI / 2
    group.add(locRing)

    const locRing2 = new THREE.Mesh(GEOMETRIES.locationRing2, getBasicMaterial(0xe4b15a, 0.2))
    locRing2.scale.set(radius, radius, radius)
    locRing2.rotation.x = Math.PI / 2.5
    group.add(locRing2)
  }

  // Selection Pulse Halo
  if (selected) {
    const halo = new THREE.Mesh(GEOMETRIES.selectionHalo, getBasicMaterial(0x5ee0b5, 0.8))
    halo.scale.set(radius, radius, radius)
    halo.rotation.x = Math.PI / 4
    group.add(halo)
  }

  // Text label with optional cluster count
  if (showLabels || selected || isProject || node.type === 'location' || node.type === 'category') {
    const badge = (isProject || node.type === 'category') && node.clusterCount ? `${node.clusterCount} assets` : undefined
    const sprite = labelSprite(node.label, node.type, selected, badge)
    if (sprite) {
      sprite.position.set(0, radius + 4.8, 0)
      group.add(sprite)
    }
  }

  return group
}

export const EvidenceGraph = React.memo(
  forwardRef<
    GraphHandle,
    {
      data: GraphPayload
      showLabels: boolean
      selectedId?: string | null
      highlight?: Set<string> | null
      layers?: LayerVisibility
      collapsedProjects?: Set<string>
      onNode: (node: GraphNode) => void
      onLink: (link: GraphLink) => void
      onDouble: (node: GraphNode) => void
      onContextMenu?: (node: GraphNode, event: MouseEvent) => void
    }
  >(function EvidenceGraph(
    {
      data,
      showLabels,
      selectedId,
      highlight,
      layers,
      collapsedProjects,
      onNode,
      onLink,
      onDouble,
      onContextMenu,
    },
    ref,
  ) {
    const wrap = useRef<HTMLDivElement>(null)
    const graphRef = useRef<any>(null)
    const dressed = useRef(false)
    const [size, setSize] = useState({ width: 800, height: 640 })
    const { theme } = useTheme()
    const isLight = theme === 'light'

    useEffect(() => {
      const element = wrap.current
      if (!element) return
      let frameId: number | null = null
      const observer = new ResizeObserver((entries) => {
        if (!entries[0]) return
        const { width, height } = entries[0].contentRect
        if (frameId) cancelAnimationFrame(frameId)
        frameId = requestAnimationFrame(() => {
          setSize((prev) => {
            if (Math.abs(prev.width - width) < 4 && Math.abs(prev.height - height) < 4) {
              return prev
            }
            return { width: Math.round(width), height: Math.round(Math.max(320, height)) }
          })
        })
      })
      observer.observe(element)
      return () => {
        if (frameId) cancelAnimationFrame(frameId)
        observer.disconnect()
      }
    }, [])

    // Filter graph data based on Layers and Collapsed Project Clusters
    const graphData = useMemo(() => {
      let nodes = data.nodes.map((node) => ({ ...node })) as LiveNode[]
      let links = data.links.map((link) => ({ ...link }))

      // 1. Layer filtering
      if (layers) {
        nodes = nodes.filter((n) => {
          if (n.type === 'project') return layers.projects
          if (n.type === 'media') return layers.media
          if (n.type === 'location') return layers.locations
          if (n.type === 'activity') return layers.activities
          if (n.type === 'report') return layers.reports
          if (n.type === 'evidence_set') return layers.evidence
          if (n.type === 'organization' || n.type === 'partner') return layers.organizations
          return true
        })
      }

      // 2. Project cluster collapse filtering
      if (collapsedProjects && collapsedProjects.size > 0) {
        const hiddenMediaIds = new Set<string>()

        for (const link of links) {
          const src = typeof link.source === 'string' ? link.source : (link.source as any)?.id
          const tgt = typeof link.target === 'string' ? link.target : (link.target as any)?.id

          const isProjectRelation = link.relation === 'BELONGS_TO' || link.relation === 'FILED_IN'
          if (collapsedProjects.has(src) && isProjectRelation) {
            hiddenMediaIds.add(tgt)
          } else if (collapsedProjects.has(tgt) && isProjectRelation) {
            hiddenMediaIds.add(src)
          }
        }

        nodes = nodes.filter((n) => !hiddenMediaIds.has(n.id))
      }

      const nodeIds = new Set(nodes.map((n) => n.id))

      // Filter links to only connect visible nodes
      links = links.filter((link) => {
        const src = typeof link.source === 'string' ? link.source : (link.source as any)?.id
        const tgt = typeof link.target === 'string' ? link.target : (link.target as any)?.id
        return nodeIds.has(src) && nodeIds.has(tgt)
      })

      return { nodes, links }
    }, [data, layers, collapsedProjects])

    useImperativeHandle(ref, () => ({
      zoomToFit: () => graphRef.current?.zoomToFit(500, 60),
      zoom: (direction) => {
        const camera = graphRef.current?.camera()
        if (!camera || !graphRef.current) return
        const factor = direction > 0 ? 0.72 : 1.28
        graphRef.current.cameraPosition(
          { x: camera.position.x * factor, y: camera.position.y * factor, z: camera.position.z * factor },
          { x: 0, y: 0, z: 0 },
          350,
        )
      },
      flyTo: (id) => {
        const node = graphRef.current?.graphData().nodes.find((item: LiveNode) => item.id === id)
        if (!node || !graphRef.current) return
        const x = node.x ?? 0
        const y = node.y ?? 0
        const z = node.z ?? 0
        const dist = Math.max(35, Math.hypot(x, y, z))
        const ratio = 1 + 95 / dist
        graphRef.current.cameraPosition({ x: x * ratio, y: y * ratio, z: z * ratio }, { x, y, z }, 700)
      },
      unpin: (id) => {
        const node = graphRef.current?.graphData().nodes.find((item: LiveNode) => item.id === id)
        if (!node) return
        node.fx = undefined
        node.fy = undefined
        node.fz = undefined
      },
      camera: () => graphRef.current?.camera(),
    }))

    return (
      <div ref={wrap} className="h-full w-full select-none relative will-change-transform">
        <ForceGraph3D
          ref={graphRef}
          width={size.width}
          height={size.height}
          graphData={graphData}
          backgroundColor={isLight ? '#fbfbfc' : '#08090b'}
          showNavInfo={false}
          nodeLabel={(node) => `${(node as LiveNode).label} (${(node as LiveNode).type})`}
          nodeThreeObject={(node) => {
            const live = node as LiveNode
            const isSelected = live.id === selectedId
            const dimmed = Boolean(highlight && highlight.size > 0 && !highlight.has(live.id))
            const stateKey = `${isSelected ? 1 : 0}_${dimmed ? 1 : 0}_${showLabels ? 1 : 0}`

            // High-performance node object caching: reuse 3D instance if state unchanged
            if (live.__threeGroup && live.__stateKey === stateKey) {
              return live.__threeGroup
            }

            const group = objectFor(live, showLabels, isSelected, dimmed)
            live.__threeGroup = group
            live.__stateKey = stateKey
            return group
          }}
          nodeThreeObjectExtend={false}
          linkCurvature={(link) => {
            const item = link as any
            if (item.relation === 'CAPTURED_AT') return 0.16
            if (item.relation === 'BELONGS_TO') return 0.08
            if (item.relation === 'VERIFIES') return 0.14
            return 0.11
          }}
          linkColor={(link) => {
            const item = link as any
            const srcId = typeof item.source === 'string' ? item.source : item.source?.id
            const tgtId = typeof item.target === 'string' ? item.target : item.target?.id
            const isConnectedToSelected = selectedId && (srcId === selectedId || tgtId === selectedId)

            if (isConnectedToSelected) return isLight ? 'rgba(5, 150, 105, 0.98)' : 'rgba(94, 224, 181, 0.98)'
            
            // Relation-aware luminous colors
            if (item.relation === 'CAPTURED_AT') {
              return isLight ? 'rgba(217, 119, 6, 0.45)' : 'rgba(228, 177, 90, 0.42)'
            }
            if (item.relation === 'VERIFIES' || item.relation === 'CONFIRMED_BY') {
              return isLight ? 'rgba(13, 148, 136, 0.5)' : 'rgba(94, 224, 181, 0.45)'
            }
            if (item.relation === 'FILED_IN' || item.relation === 'CITED_IN') {
              return isLight ? 'rgba(180, 83, 9, 0.4)' : 'rgba(240, 215, 176, 0.38)'
            }
            const alpha = 0.2 + (item.confidence || 0.5) * 0.3
            return isLight ? `rgba(15, 23, 42, ${alpha})` : `rgba(142, 183, 255, ${alpha})`
          }}
          linkWidth={(link) => {
            const item = link as any
            const srcId = typeof item.source === 'string' ? item.source : item.source?.id
            const tgtId = typeof item.target === 'string' ? item.target : item.target?.id
            if (selectedId && (srcId === selectedId || tgtId === selectedId)) return 2.4
            return 0.8
          }}
          linkOpacity={0.8}
          // Ambient living particles on seed links + fast energetic stream on active node links
          linkDirectionalParticles={(link) => {
            const item = link as any
            const srcId = typeof item.source === 'string' ? item.source : item.source?.id
            const tgtId = typeof item.target === 'string' ? item.target : item.target?.id
            if (selectedId && (srcId === selectedId || tgtId === selectedId)) return 3
            const seed = (typeof item.id === 'string' ? item.id.charCodeAt(0) : 0) % 4
            return seed === 0 ? 1 : 0
          }}
          linkDirectionalParticleWidth={(link) => {
            const item = link as any
            const srcId = typeof item.source === 'string' ? item.source : item.source?.id
            const tgtId = typeof item.target === 'string' ? item.target : item.target?.id
            return selectedId && (srcId === selectedId || tgtId === selectedId) ? 1.6 : 0.8
          }}
          linkDirectionalParticleSpeed={(link) => {
            const item = link as any
            const srcId = typeof item.source === 'string' ? item.source : item.source?.id
            const tgtId = typeof item.target === 'string' ? item.target : item.target?.id
            return selectedId && (srcId === selectedId || tgtId === selectedId) ? 0.015 : 0.005
          }}
          linkDirectionalParticleColor={(link) => {
            const item = link as any
            const srcId = typeof item.source === 'string' ? item.source : item.source?.id
            const tgtId = typeof item.target === 'string' ? item.target : item.target?.id
            if (selectedId && (srcId === selectedId || tgtId === selectedId)) {
              return isLight ? '#059669' : '#5ee0b5'
            }
            if (item.relation === 'CAPTURED_AT') return '#e4b15a'
            if (item.relation === 'VERIFIES') return '#5ee0b5'
            return isLight ? '#0284c7' : '#8eb7ff'
          }}
          // Fast-converging simulation physics that quickly cools to 0% CPU
          warmupTicks={60}
          cooldownTicks={20}
          cooldownTime={1200}
          d3AlphaDecay={0.035}
          d3VelocityDecay={0.35}
          onEngineStop={() => {
            const scene = graphRef.current?.scene() as THREE.Scene | undefined
            if (!scene || dressed.current) return

            // 1. Ambient lighting with rich illumination
            const ambientLight = new THREE.AmbientLight(0xffffff, isLight ? 1.4 : 1.15)
            scene.add(ambientLight)

            // 2. Key directional light (Mint energetic specular)
            const topLight = new THREE.DirectionalLight(isLight ? 0x059669 : 0x5ee0b5, 0.9)
            topLight.position.set(120, 180, 120)
            scene.add(topLight)

            // 3. Fill directional light (Warm Amber horizon glow)
            const bottomLight = new THREE.DirectionalLight(0xe4b15a, 0.65)
            bottomLight.position.set(-120, -180, -120)
            scene.add(bottomLight)

            // 4. Deep rim light (Sapphire blue edge glow)
            const rimLight = new THREE.DirectionalLight(0x8eb7ff, 0.45)
            rimLight.position.set(-80, 100, -120)
            scene.add(rimLight)

            // 5. Multi-depth Star particles field with dual-tone cosmos
            const starsGeo = new THREE.BufferGeometry()
            const starCount = 350
            const posArray = new Float32Array(starCount * 3)
            const colorArray = new Float32Array(starCount * 3)

            for (let i = 0; i < starCount * 3; i += 3) {
              posArray[i] = (Math.random() - 0.5) * 1600
              posArray[i + 1] = (Math.random() - 0.5) * 1600
              posArray[i + 2] = (Math.random() - 0.5) * 1600

              const tint = Math.random()
              if (tint < 0.3) {
                colorArray[i] = 0.37; colorArray[i + 1] = 0.88; colorArray[i + 2] = 0.71 // mint
              } else if (tint < 0.6) {
                colorArray[i] = 0.56; colorArray[i + 1] = 0.72; colorArray[i + 2] = 1.0 // sky
              } else {
                colorArray[i] = 0.95; colorArray[i + 1] = 0.95; colorArray[i + 2] = 0.98 // white
              }
            }
            starsGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
            starsGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3))

            const starsMat = new THREE.PointsMaterial({
              vertexColors: true,
              size: isLight ? 1.3 : 1.6,
              transparent: true,
              opacity: isLight ? 0.35 : 0.55,
              sizeAttenuation: true,
            })
            const starField = new THREE.Points(starsGeo, starsMat)
            scene.add(starField)

            // 6. Coordinate floor grid with refined cybernetic gridlines
            const grid = new THREE.GridHelper(
              800,
              48,
              isLight ? 0x059669 : 0x1f4a3c,
              isLight ? 0xe2e8f0 : 0x0c1318,
            )
            grid.position.y = -70
            scene.add(grid)

            dressed.current = true
          }}
          onNodeClick={(node) => onNode(node as GraphNode)}
          onNodeRightClick={(node, event) => {
            if (onContextMenu) {
              onContextMenu(node as GraphNode, event)
            } else {
              onDouble(node as GraphNode)
            }
          }}
          onNodeDragEnd={(node) => {
            const live = node as LiveNode
            live.fx = live.x
            live.fy = live.y
            live.fz = live.z
          }}
          onLinkClick={(link) => {
            const item = link as any
            const source = typeof item.source === 'string' ? item.source : item.source.id
            const target = typeof item.target === 'string' ? item.target : item.target.id
            onLink({
              id: item.id,
              source,
              target,
              relation: item.relation,
              confidence: item.confidence,
              why: item.why ?? [],
            })
          }}
          onNodeHover={(node) => {
            document.body.style.cursor = node ? 'pointer' : 'default'
          }}
        />
      </div>
    )
  }),
)
