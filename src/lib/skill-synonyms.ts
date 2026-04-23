/**
 * SKILL SYNONYMS MAP
 * Maps every worker skill chip label → all words/phrases the AI might use.
 * Used for fuzzy matching in job broadcast so "Cook/Chef" matches "Cooking",
 * "AC Technician" matches "Air Conditioning", etc.
 *
 * Rules:
 * - Keys are lowercase versions of chip labels
 * - Values include the key itself + all realistic AI tag variants
 * - Keep entries short (single words or 2-word phrases) for substring matching
 */
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

/**
 * Returns true if any required AI tag matches any of the worker's skills
 * using the synonym map + bidirectional substring fallback.
 */
export function skillsMatch(workerSkills: string[], requiredTags: string[]): boolean {
  if (requiredTags.length === 0) return true;   // job has no tags → all workers eligible
  if (workerSkills.length === 0) return false;

  const tagsLower = requiredTags.map(t => t.toLowerCase());

  for (const skill of workerSkills) {
    const skillLower = skill.toLowerCase();

    // Get all synonyms for this skill chip (key lookup + fallback to skill itself)
    const synonyms = SKILL_SYNONYMS[skillLower] ?? [skillLower];

    for (const tag of tagsLower) {
      // 1. Check synonym list (exact word match)
      if (synonyms.some(s => s === tag || tag.includes(s) || s.includes(tag))) {
        return true;
      }
      // 2. Bidirectional substring fallback for custom/unknown skills
      if (skillLower.includes(tag) || tag.includes(skillLower)) {
        return true;
      }
    }
  }

  return false;
}
