export interface TaxonomyTerm {
  id: string
  label: string
  hints: string[]
  description: string
}

export const ACTIVITIES: TaxonomyTerm[] = [
  {
    id: 'tree_planting',
    label: 'Tree planting',
    hints: ['tree', 'sapling', 'plant', 'plantation', 'native', 'seedling', 'nursery'],
    description: 'People or site conditions showing trees, saplings, or planting work.',
  },
  {
    id: 'waste_collection',
    label: 'Waste collection',
    hints: ['waste', 'trash', 'plastic', 'cleanup', 'garbage', 'bag', 'litter', 'debris'],
    description: 'Waste bags, plastic, or a cleanup underway.',
  },
  {
    id: 'water_testing',
    label: 'Water testing',
    hints: ['sample', 'testing', 'bottle', 'turbid', 'quality', 'lab'],
    description: 'Water sampling or testing equipment at a field site.',
  },
  {
    id: 'water_restoration',
    label: 'Water restoration',
    hints: ['river', 'yamuna', 'bank', 'restoration', 'wetland', 'ghat', 'barrage'],
    description: 'A river, wetland, or bank where restoration work is visible.',
  },
  {
    id: 'solar_installation',
    label: 'Solar installation',
    hints: ['solar', 'panel', 'photovoltaic', 'courtyard', 'array', 'inverter'],
    description: 'Solar panels or an installation in progress.',
  },
  {
    id: 'sanitation',
    label: 'Sanitation',
    hints: ['toilet', 'sanitation', 'latrine', 'hygiene', 'wash'],
    description: 'Sanitation infrastructure or hygiene activity.',
  },
  {
    id: 'road_infrastructure',
    label: 'Road infrastructure',
    hints: ['road', 'path', 'bridge', 'culvert', 'pavement'],
    description: 'A path, road, or small infrastructure work.',
  },
  {
    id: 'education_outreach',
    label: 'Education outreach',
    hints: ['workshop', 'school', 'training', 'classroom', 'outreach', 'meeting'],
    description: 'A workshop, class, or community meeting.',
  },
  {
    id: 'biodiversity_monitoring',
    label: 'Biodiversity monitoring',
    hints: ['bird', 'species', 'biodiversity', 'wildlife', 'survey', 'ridge', 'habitat'],
    description: 'Habitat, species, or a biodiversity survey.',
  },
]

export const EVIDENCE_SIGNALS: TaxonomyTerm[] = [
  { id: 'saplings', label: 'Saplings', hints: ['sapling', 'seedling', 'nursery'], description: 'Young planted trees.' },
  { id: 'mature_trees', label: 'Mature trees', hints: ['canopy', 'mature tree', 'forest'], description: 'Established trees.' },
  { id: 'waste_bags', label: 'Waste bags', hints: ['bag', 'sack', 'gunny'], description: 'Collected waste in bags.' },
  { id: 'plastic_waste', label: 'Plastic waste', hints: ['plastic', 'bottle', 'wrapper'], description: 'Visible plastic waste.' },
  { id: 'water_body', label: 'Water body', hints: ['river', 'water', 'pond', 'lake', 'stream'], description: 'Visible water.' },
  { id: 'construction', label: 'Construction', hints: ['construction', 'concrete', 'masonry'], description: 'Built work underway.' },
  { id: 'solar_panel', label: 'Solar panel', hints: ['solar', 'panel', 'array'], description: 'A solar panel is visible.' },
  { id: 'community_group', label: 'Community group', hints: ['group', 'volunteer', 'community', 'team'], description: 'A group of people at the site.' },
  { id: 'protective_equipment', label: 'Protective equipment', hints: ['gloves', 'helmet', 'vest', 'ppe'], description: 'Protective equipment is visible.' },
]

export const CHANGE_TYPES: TaxonomyTerm[] = [
  { id: 'vegetation_increase', label: 'Vegetation increase', hints: ['greener', 'vegetation', 'sapling', 'canopy'], description: 'Later frames show more vegetation.' },
  { id: 'waste_reduction', label: 'Waste reduction', hints: ['cleaner', 'removed', 'cleanup', 'after'], description: 'Later frames show less waste.' },
  { id: 'infrastructure_added', label: 'Infrastructure added', hints: ['installed', 'panel', 'built', 'path'], description: 'A structure appears that was not in the earlier frame.' },
  { id: 'land_restoration', label: 'Land restoration', hints: ['restored', 'bank', 'soil', 'mulch'], description: 'The ground surface has been worked.' },
  { id: 'activity_progress', label: 'Activity progress', hints: ['progress', 'underway', 'session'], description: 'The same activity continues across frames.' },
]

export interface ContentCategory {
  id:
    | 'travel_landscape'
    | 'events_gatherings'
    | 'personal_meeting'
    | 'work_documentation'
    | 'field_operations'
    | 'community_social'
    | 'general_evidence'
  label: string
  color: string
  hints: string[]
  description: string
}

export const CONTENT_CATEGORIES: ContentCategory[] = [
  {
    id: 'travel_landscape',
    label: 'Travel & Exploration',
    color: '#06b6d4',
    hints: [
      'switzerland', 'swiss', 'alps', 'mountain', 'lake', 'landscape', 'scenic',
      'travel', 'trip', 'vacation', 'tourism', 'tourist', 'holiday', 'resort',
      'beach', 'ocean', 'sea', 'hiking', 'valley', 'viewpoint', 'destination',
      'waterfall', 'fjord', 'glacier', 'sunset', 'nature', 'outdoor', 'hill',
      'wanderlust', 'monument', 'flight', 'hotel', 'forest', 'wilderness'
    ],
    description: 'Scenic landscapes, travel photography, mountains, lakes, tourism, vacations, and outdoor expeditions.',
  },
  {
    id: 'events_gatherings',
    label: 'Events & Gatherings',
    color: '#f59e0b',
    hints: [
      'event', 'conference', 'summit', 'hackathon', 'festival', 'party', 'gathering',
      'workshop', 'stage', 'celebration', 'ceremony', 'concert', 'exhibition',
      'sports', 'audience', 'keynote', 'webinar', 'meetup', 'dinner', 'gala', 'award'
    ],
    description: 'Public or private gatherings, conferences, summits, hackathons, festivals, ceremonies, and celebrations.',
  },
  {
    id: 'personal_meeting',
    label: 'Personal & Meetings',
    color: '#a855f7',
    hints: [
      'person', 'face', 'people', 'man', 'woman', 'selfie', 'meet', 'meeting',
      'zoom', 'teams', 'call', 'webcam', 'portrait', 'avatar', 'headshot',
      'whatsapp', 'online meet', 'video call', 'conference_call', 'camera', 'profile',
      'human', 'glasses', 'smile', 'family', 'friends'
    ],
    description: 'Personal portraits, webcam selfies, family & friends, and online video meetings with people.',
  },
  {
    id: 'work_documentation',
    label: 'Work & Documentation',
    color: '#38bdf8',
    hints: [
      'code', 'ide', 'vscode', 'terminal', 'programming', 'developer', 'github', 'git',
      'slide', 'presentation', 'dashboard', 'chart', 'graph', 'table', 'invoice', 'receipt',
      'document', 'diagram', 'ui', 'software', 'browser_ui', 'pdf', 'sheet', 'spreadsheet',
      'excel', 'wireframe', 'dev_tools', 'architecture_diagram'
    ],
    description: 'Work documentation, software code, UI designs, invoices, spreadsheets, charts, and digital artifacts.',
  },
  {
    id: 'field_operations',
    label: 'Field Operations',
    color: '#10b981',
    hints: [
      'tree', 'planting', 'river', 'water', 'solar', 'panel', 'waste', 'soil',
      'restoration', 'construction', 'survey', 'drone', 'field', 'sapling',
      'cleanup', 'biodiversity', 'bank', 'ghat', 'nursery', 'canal', 'infrastructure'
    ],
    description: 'Physical on-site environmental, agricultural, or field operations.',
  },
  {
    id: 'community_social',
    label: 'Community & Social Impact',
    color: '#f43f5e',
    hints: [
      'community', 'volunteer', 'social', 'outreach', 'food_drive', 'charity',
      'ngo', 'aid', 'relief', 'donation', 'civic', 'welfare', 'public_service', 'awareness'
    ],
    description: 'Community initiatives, volunteer drives, social impact programs, and public outreach.',
  },
]

export function tagDefinitionBatches(limit = 10) {
  const definitions = [...ACTIVITIES, ...EVIDENCE_SIGNALS, ...CHANGE_TYPES, ...CONTENT_CATEGORIES].map((term) => ({
    name: term.id,
    description: term.description,
  }))
  const batches: { name: string; description: string }[][] = []
  for (let index = 0; index < definitions.length; index += limit) {
    batches.push(definitions.slice(index, index + limit))
  }
  return batches
}

export function classifyText(text: string) {
  const hay = text.toLowerCase()
  const scoreTerms = (terms: { id: string; label: string; hints: string[]; description: string }[]) =>
    terms
      .map((term) => ({
        term,
        score: term.hints.reduce((sum, hint) => sum + (hay.includes(hint) ? 1 : 0), 0),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)

  const activities = scoreTerms(ACTIVITIES)
  const signals = scoreTerms(EVIDENCE_SIGNALS)
  const changes = scoreTerms(CHANGE_TYPES)
  const contentCategories = scoreTerms(CONTENT_CATEGORIES)

  const detectedCategory = contentCategories[0]?.term ?? (
    activities.length > 0 || signals.length > 0
      ? CONTENT_CATEGORIES.find((c) => c.id === 'field_operations')!
      : { id: 'general_evidence' as const, label: 'General Evidence', color: '#94a3b8', hints: [], description: 'General intake' }
  )

  return {
    activity: activities[0]?.term ?? null,
    activityScore: activities[0]?.score ?? 0,
    signals: signals.map((entry) => entry.term),
    change: changes[0]?.term ?? null,
    contentCategory: detectedCategory.id as ContentCategory['id'],
    categoryLabel: detectedCategory.label,
  }
}
