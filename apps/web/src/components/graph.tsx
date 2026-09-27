import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
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
  tag: '#8a847b',
}

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

function labelSprite(text: string, nodeType: string, selected = false, badgeText?: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 720
  canvas.height = 140
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const label = text.length > 28 ? text.slice(0, 26) + '…' : text
  const color = COLORS[nodeType] || '#f4f0e6'

  // Pill background
  const pillWidth = Math.min(680, Math.max(260, label.length * 17 + (badgeText ? 150 : 80)))
  const pillHeight = 76
  const x = (canvas.width - pillWidth) / 2
  const y = (canvas.height - pillHeight) / 2
  const r = 38

  ctx.beginPath()
  ctx.roundRect(x, y, pillWidth, pillHeight, r)
  ctx.fillStyle = selected ? 'rgba(16, 22, 28, 0.96)' : 'rgba(8, 10, 14, 0.90)'
  ctx.fill()
  ctx.lineWidth = selected ? 3.5 : 2
  ctx.strokeStyle = selected ? '#5ee0b5' : 'rgba(255, 255, 255, 0.18)'
  ctx.stroke()

  // Node type dot
  ctx.beginPath()
  ctx.arc(x + 36, y + pillHeight / 2, 8, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()

  // Text label
  ctx.font = '600 32px "Instrument Sans", system-ui, sans-serif'
  ctx.fillStyle = selected ? '#ffffff' : '#f4f0e6'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + 56, y + pillHeight / 2)

  // Badge text (e.g. cluster media count)
  if (badgeText) {
    const badgeX = x + pillWidth - 70
    ctx.font = '700 24px "DM Mono", monospace'
    ctx.fillStyle = '#5ee0b5'
    ctx.textAlign = 'center'
    ctx.fillText(badgeText, badgeX, y + pillHeight / 2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  )
  sprite.scale.set(24, 4.6, 1)
  sprite.position.set(0, 11, 0)
  return sprite
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
}

function objectFor(node: LiveNode, showLabels: boolean, selected: boolean, dimmed: boolean) {
  const group = new THREE.Group()
  const baseColor = COLORS[node.type] || '#f4f0e6'
  const color = new THREE.Color(dimmed ? '#1a1d24' : baseColor)
  const radius = Math.max(3.5, (node.size || 7) * 0.44)

  // 1. MEDIA NODES: Mesmerizing 3D Photo Card
  if (node.type === 'media' && node.imageUrl) {
    const cardWidth = 16
    const cardHeight = 11
    const cardDepth = 0.6

    // Photo texture face
    const photoMat = new THREE.MeshBasicMaterial({
      map: textureFor(node.imageUrl),
      transparent: false,
    })
    const borderMat = new THREE.MeshStandardMaterial({
      color: selected ? 0x5ee0b5 : dimmed ? 0x22262e : 0x2a303c,
      emissive: selected ? 0x5ee0b5 : 0x000000,
      emissiveIntensity: selected ? 0.6 : 0,
      roughness: 0.3,
      metalness: 0.1,
    })

    // Double-sided box card
    const cardMesh = new THREE.Mesh(new THREE.BoxGeometry(cardWidth, cardHeight, cardDepth), [
      borderMat,
      borderMat,
      borderMat,
      borderMat,
      photoMat,
      borderMat,
    ])
    group.add(cardMesh)

    // Glowing border frame
    const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(cardWidth + 0.3, cardHeight + 0.3, cardDepth + 0.1))
    const frameMat = new THREE.LineBasicMaterial({
      color: selected ? 0x5ee0b5 : 0x8892a0,
      linewidth: selected ? 2 : 1,
      transparent: true,
      opacity: selected ? 0.9 : 0.4,
    })
    group.add(new THREE.LineSegments(frameGeo, frameMat))

    if (selected) {
      // Radiant aura ring
      const halo = new THREE.Mesh(
        new THREE.RingGeometry(cardWidth * 0.62, cardWidth * 0.72, 32),
        new THREE.MeshBasicMaterial({ color: 0x5ee0b5, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }),
      )
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
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.15,
    emissive: selected ? color : node.type === 'project' ? color : '#000000',
    emissiveIntensity: selected ? 0.65 : node.type === 'project' ? 0.3 : node.metadata?.pending ? 0.3 : 0.05,
  })

  let geometry: THREE.BufferGeometry = new THREE.SphereGeometry(radius, 32, 32)

  // Distinct semantic forms per node type
  if (node.type === 'location') {
    geometry = new THREE.OctahedronGeometry(radius * 1.1)
  } else if (node.type === 'activity') {
    geometry = new THREE.ConeGeometry(radius * 0.85, radius * 1.85, 5)
  } else if (node.type === 'report') {
    geometry = new THREE.BoxGeometry(radius * 1.4, radius * 1.7, radius * 0.45)
  } else if (node.type === 'partner') {
    geometry = new THREE.IcosahedronGeometry(radius * 0.95, 0)
  } else if (node.type === 'evidence_set') {
    geometry = new THREE.DodecahedronGeometry(radius * 1.05)
  } else if (node.type === 'tag') {
    geometry = new THREE.SphereGeometry(radius * 0.6, 12, 12)
  }

  const mainMesh = new THREE.Mesh(geometry, material)
  group.add(mainMesh)

  // Celestial Planetary Orbit Rings for Projects (Semantic Gravity Center)
  if (node.type === 'project') {
    const ringGeo = new THREE.RingGeometry(radius * 1.5, radius * 1.65, 48)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x5ee0b5,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: selected ? 0.85 : 0.45,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = Math.PI / 3.2
    group.add(ring)

    // Outer cluster halo ring
    const outerRingGeo = new THREE.RingGeometry(radius * 1.9, radius * 2.0, 48)
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x5ee0b5,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: selected ? 0.6 : 0.2,
    })
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat)
    outerRing.rotation.x = -Math.PI / 4
    group.add(outerRing)

    // Atmospheric outer glow shell
    const shellGeo = new THREE.SphereGeometry(radius * 1.15, 24, 24)
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0x5ee0b5,
      wireframe: true,
      transparent: true,
      opacity: selected ? 0.45 : 0.15,
    })
    group.add(new THREE.Mesh(shellGeo, shellMat))
  }

  // Organization Nexus Halo
  if (node.type === 'organization') {
    const orgRing = new THREE.Mesh(
      new THREE.RingGeometry(radius * 1.4, radius * 1.55, 48),
      new THREE.MeshBasicMaterial({ color: 0xf4f0e6, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }),
    )
    orgRing.rotation.x = Math.PI / 2
    group.add(orgRing)
  }

  // Location Diamond Beacon Aura
  if (node.type === 'location') {
    const locRing = new THREE.Mesh(
      new THREE.RingGeometry(radius * 1.25, radius * 1.4, 32),
      new THREE.MeshBasicMaterial({ color: 0xe4b15a, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }),
    )
    locRing.rotation.x = Math.PI / 2
    group.add(locRing)
  }

  // Selection Pulse Halo
  if (selected) {
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(radius * 1.55, radius * 1.72, 36),
      new THREE.MeshBasicMaterial({
        color: 0x5ee0b5,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      }),
    )
    halo.rotation.x = Math.PI / 4
    group.add(halo)
  }

  // Text label with optional cluster count
  if (showLabels || selected) {
    const badge = node.type === 'project' && node.clusterCount ? `${node.clusterCount} assets` : undefined
    const sprite = labelSprite(node.label, node.type, selected, badge)
    if (sprite) {
      sprite.position.set(0, radius + 4.8, 0)
      group.add(sprite)
    }
  }

  return group
}

export const EvidenceGraph = forwardRef<
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
    const observer = new ResizeObserver(() => {
      setSize({ width: element.clientWidth, height: Math.max(320, element.clientHeight) })
    })
    observer.observe(element)
    return () => observer.disconnect()
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
      // Find media nodes connected to collapsed projects
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
    zoomToFit: () => graphRef.current?.zoomToFit(600, 70),
    zoom: (direction) => {
      const camera = graphRef.current?.camera()
      if (!camera || !graphRef.current) return
      const factor = direction > 0 ? 0.72 : 1.28
      graphRef.current.cameraPosition(
        { x: camera.position.x * factor, y: camera.position.y * factor, z: camera.position.z * factor },
        { x: 0, y: 0, z: 0 },
        400,
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
      graphRef.current.cameraPosition({ x: x * ratio, y: y * ratio, z: z * ratio }, { x, y, z }, 900)
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
    <div ref={wrap} className="h-full w-full select-none relative">
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
          return objectFor(live, showLabels, isSelected, dimmed)
        }}
        nodeThreeObjectExtend={false}
        linkColor={(link) => {
          const item = link as any
          const srcId = typeof item.source === 'string' ? item.source : item.source?.id
          const tgtId = typeof item.target === 'string' ? item.target : item.target?.id
          const isConnectedToSelected = selectedId && (srcId === selectedId || tgtId === selectedId)

          if (isConnectedToSelected) return isLight ? 'rgba(5, 150, 105, 0.95)' : 'rgba(94, 224, 181, 0.95)'
          const alpha = 0.2 + (item.confidence || 0.5) * 0.45
          return isLight ? `rgba(15, 23, 42, ${alpha})` : `rgba(244, 240, 230, ${alpha})`
        }}
        linkWidth={(link) => {
          const item = link as any
          const srcId = typeof item.source === 'string' ? item.source : item.source?.id
          const tgtId = typeof item.target === 'string' ? item.target : item.target?.id
          if (selectedId && (srcId === selectedId || tgtId === selectedId)) return 2.2
          return 0.5 + ((item as GraphLink).confidence || 0.5) * 0.9
        }}
        linkOpacity={0.8}
        linkDirectionalParticles={(link) => {
          const item = link as any
          const srcId = typeof item.source === 'string' ? item.source : item.source?.id
          const tgtId = typeof item.target === 'string' ? item.target : item.target?.id
          if (selectedId && (srcId === selectedId || tgtId === selectedId)) return 3
          return ((item as GraphLink).confidence || 0) > 0.8 ? 1 : 0
        }}
        linkDirectionalParticleWidth={(link) => {
          const item = link as any
          const srcId = typeof item.source === 'string' ? item.source : item.source?.id
          const tgtId = typeof item.target === 'string' ? item.target : item.target?.id
          return selectedId && (srcId === selectedId || tgtId === selectedId) ? 1.4 : 0.8
        }}
        linkDirectionalParticleSpeed={(link) => {
          const item = link as any
          const srcId = typeof item.source === 'string' ? item.source : item.source?.id
          const tgtId = typeof item.target === 'string' ? item.target : item.target?.id
          return selectedId && (srcId === selectedId || tgtId === selectedId) ? 0.015 : 0.007
        }}
        linkDirectionalParticleColor={() => (isLight ? '#059669' : '#5ee0b5')}
        cooldownTicks={120}
        warmupTicks={35}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        onEngineStop={() => {
          const scene = graphRef.current?.scene() as THREE.Scene | undefined
          if (!scene || dressed.current) return

          // Mesmerizing lighting & ambience
          const ambientLight = new THREE.AmbientLight(0xffffff, isLight ? 1.4 : 1.1)
          scene.add(ambientLight)

          const topLight = new THREE.DirectionalLight(isLight ? 0x059669 : 0x5ee0b5, 0.8)
          topLight.position.set(100, 150, 100)
          scene.add(topLight)

          const bottomLight = new THREE.DirectionalLight(0xe4b15a, 0.6)
          bottomLight.position.set(-100, -150, -100)
          scene.add(bottomLight)

          // Distant star particles field (dark mode) or dust particles (light mode)
          const starsGeo = new THREE.BufferGeometry()
          const starCount = 350
          const posArray = new Float32Array(starCount * 3)
          for (let i = 0; i < starCount * 3; i += 3) {
            posArray[i] = (Math.random() - 0.5) * 1600
            posArray[i + 1] = (Math.random() - 0.5) * 1600
            posArray[i + 2] = (Math.random() - 0.5) * 1600
          }
          starsGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
          const starsMat = new THREE.PointsMaterial({
            color: isLight ? 0x94a3b8 : 0x9fb0be,
            size: isLight ? 1.2 : 1.6,
            transparent: true,
            opacity: isLight ? 0.35 : 0.5,
          })
          const starField = new THREE.Points(starsGeo, starsMat)
          scene.add(starField)

          // Coordinate floor grid
          const grid = new THREE.GridHelper(
            640,
            48,
            isLight ? 0x059669 : 0x1f382f,
            isLight ? 0xe2e8f0 : 0x0f1519,
          )
          grid.position.y = -65
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
})
