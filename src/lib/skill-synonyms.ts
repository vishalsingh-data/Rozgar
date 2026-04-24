export const SKILL_SYNONYMS: Record<string, string[]> = {
  'electrician': [
    'electrician', 'electrical', 'electric', 'wiring', 'wire', 'circuit',
    'switchboard', 'plug', 'socket', 'fan', 'light', 'fitting', 'mcb',
    'fuse', 'power', 'inverter', 'short circuit',
  ],
  'plumber': [
    'plumber', 'plumbing', 'pipe', 'drain', 'tap', 'faucet', 'water leak',
    'sink', 'toilet', 'bathroom', 'geyser installation', 'tank', 'valve',
    'blockage', 'overflow',
  ],
  'carpenter': [
    'carpenter', 'carpentry', 'wood', 'furniture', 'door', 'window',
    'cabinet', 'shelf', 'wardrobe', 'wooden', 'hinge', 'lock', 'plywood',
    'laminate', 'fixing',
  ],
  'painter': [
    'painter', 'painting', 'paint', 'wall', 'ceiling', 'whitewash',
    'polish', 'coat', 'distemper', 'emulsion', 'putty', 'brush',
    'roller', 'texture', 'waterproof',
  ],
  'ac technician': [
    'ac', 'air conditioning', 'air conditioner', 'hvac', 'cooling',
    'split unit', 'window unit', 'inverter ac', 'ac service', 'ac repair',
    'ac gas', 'ac installation', 'ac cleaning', 'compressor',
  ],
  'appliance repair': [
    'appliance', 'refrigerator', 'fridge', 'washing machine', 'microwave',
    'geyser', 'television', 'tv', 'mixer', 'grinder', 'dishwasher',
    'oven', 'induction', 'water purifier', 'ro', 'chimney',
  ],
  'mason': [
    'mason', 'masonry', 'brick', 'cement', 'concrete', 'tile',
    'flooring', 'tiling', 'plastering', 'construction', 'wall',
    'waterproofing', 'grouting', 'marble', 'granite',
  ],
  'welder': [
    'welder', 'welding', 'metal', 'iron', 'fabrication', 'grille',
    'gate', 'railing', 'steel', 'arc welding', 'cutting',
  ],
  'cleaning': [
    'cleaning', 'clean', 'sweep', 'mop', 'sanitize', 'housekeeping',
    'deep clean', 'sofa clean', 'carpet clean', 'disinfect', 'scrub',
    'dusting', 'mopping', 'office cleaning', 'home cleaning',
  ],
  'cook/chef': [
    'cook', 'chef', 'cooking', 'food', 'meal', 'kitchen', 'catering',
    'tiffin', 'lunch', 'dinner', 'breakfast', 'baking', 'cuisine',
    'recipe', 'dish', 'home cook', 'party cook',
  ],
  'driver': [
    'driver', 'driving', 'cab', 'taxi', 'transport', 'chauffeur',
    'vehicle', 'pickup', 'drop', 'school cab', 'car driver',
    'truck driver', 'bike rider',
  ],
  'security guard': [
    'security', 'guard', 'watchman', 'night watch', 'patrol',
    'bouncer', 'surveillance', 'gatekeeper',
  ],
  'gardener': [
    'gardener', 'gardening', 'garden', 'plant', 'lawn', 'mow',
    'trimming', 'watering', 'pruning', 'landscaping', 'potting',
  ],
  'daily wage labor': [
    'labour', 'labor', 'labourer', 'laborer', 'daily wage', 'helper',
    'assistant', 'loading', 'unloading', 'carrying', 'moving', 'shifting',
    'packing', 'manual', 'heavy work', 'physical work',
  ],
};

// Normalize a string: lowercase, collapse whitespace
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Returns true if any required AI tag matches any of the worker's skills
 * using the synonym map + bidirectional substring fallback.
 */
export function skillsMatch(workerSkills: string[], requiredTags: string[]): boolean {
  if (requiredTags.length === 0) return true;
  if (workerSkills.length === 0) return false;

  const tagsNorm = requiredTags.map(normalize);

  for (const skill of workerSkills) {
    const skillNorm = normalize(skill);
    const synonyms = SKILL_SYNONYMS[skillNorm] ?? [skillNorm];

    for (const tag of tagsNorm) {
      if (synonyms.some(s => s === tag || tag.includes(s) || s.includes(tag))) {
        return true;
      }
      if (skillNorm.includes(tag) || tag.includes(skillNorm)) {
        return true;
      }
    }
  }

  return false;
}
