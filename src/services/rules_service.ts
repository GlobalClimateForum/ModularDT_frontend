import type { ParameterDefinition } from './parameterstore_service'

// ----------------- Parameter Rules -----------------
export const OPERATORS_MAP = {
  eq: { label: 'equals', symbol: '=', function: (a: unknown, b: unknown) => a === b },
  neq: { label: 'not equals', symbol: '≠', function: (a: unknown, b: unknown) => a !== b },
  gt: { label: 'greater than', symbol: '>', function: (a: unknown, b: unknown) => Number(a) > Number(b) },
  lt: { label: 'less than', symbol: '<', function: (a: unknown, b: unknown) => Number(a) < Number(b) }
}
export const OPERATORS = Object.keys(OPERATORS_MAP) as (keyof typeof OPERATORS_MAP)[]
export type Operator = keyof typeof OPERATORS_MAP

export const RULE_KINDS = ['enabledWhen', 'maxActive'] as const
export type RuleKind = typeof RULE_KINDS[number]

type ParamLike = { default?: unknown }

export interface Condition {
  param: string        // parameter name, the key in section.parameters
  op: Operator // the operator to use for comparison
  value: unknown // the value to compare against
}

export type Rule =
  | { id: string; kind: 'enabledWhen'; target: string; when: Condition[] }
  | { id: string; kind: 'maxActive'; params: string[]; max: number }

// Returned by evaluateRules, which is used to determine which parameters are disabled, blocked, effective, or broken.
export interface RuleResult {
  disabled: Set<string>                // failed an enabledWhen rule - Which parameters are disabled by rules?
  blocked: Set<string>                 // can't be switched on, its group is full - Which parameters are blocked by maxActive rules?
  effective: Record<string, unknown>   // values to send to the slide - Which parameters are effectively active, and what are their values?
  broken: Set<string>                  // ids of rules that reference missing params - Which rules are broken because they reference missing parameters?
}

// Check a single condition against the current parameter values.
function check(condition: Condition, values: Record<string, unknown>): boolean {

  // Compare the current value of the parameter to the condition's value using the specified operator.
  const currentValue = values[condition.param]
  const targetValue = condition.value

  // If the current value is undefined, the condition cannot be satisfied.
  switch (condition.op) {
    case 'eq': return OPERATORS_MAP.eq.function(currentValue, targetValue)
    case 'neq': return OPERATORS_MAP.neq.function(currentValue, targetValue)
    case 'gt': return OPERATORS_MAP.gt.function(currentValue, targetValue)
    case 'lt': return OPERATORS_MAP.lt.function(currentValue, targetValue)
  }
}

// Get the list of parameter names that a rule references
const referencedParams = (rule: Rule): string[] => {
  return rule.kind === 'enabledWhen' ? [rule.target, ...rule.when.map(c => c.param)] : rule.params
}

// Main function to evaluate rules against the current parameter values and active parameters.
// params : the parameter definitions for the section, rules: the rules to evaluate, values: the current parameter values, active : the set of currently active parameters
export function evaluateRules(params: Record<string, ParamLike>, rules: Rule[], values: Record<string, unknown>, active: Set<string>): RuleResult {

  const broken = new Set<string>() // Set of rule IDs that reference missing parameters
  const valid: Rule[] = [] // List of rules that are valid (all referenced parameters exist)
  const groupedParams = new Set<string>() // Set of parameters that are part of any maxActive rule
  const effective: Record<string, unknown> = {} // Effective parameter values based on current values and defaults
  const disabled = new Set<string>() // Set of parameters that are disabled by enabledWhen rules
  const blocked = new Set<string>() // Set of parameters that are blocked by maxActive rules

  // Check which rules are valid (all referenced parameters exist) and which are broken.
  for (const r of rules) {
    const ok = referencedParams(r).every(p => p in params) // Check if all referenced parameters exist in the params
    if (!ok) broken.add(r.id) // If not, add the rule ID to the broken set
    else valid.push(r) // If valid, add the rule to the valid list
  }

  // Params outside any maxActive group are always active.
  for (const r of valid) {
    if (r.kind === 'maxActive') r.params.forEach(p => groupedParams.add(p)) // Add each parameter in maxActive rules to the groupedParams set
  }

  // Determine if a parameter is active based on whether it is part of a maxActive group and whether it is in the active set.
  // A parameter is active if it is not part of a maxActive group or if it is in the active set.
  const isActive = (name: string) => !groupedParams.has(name) || active.has(name)

  // Build the effective parameter values based on the current values and defaults
  for (const [name, definition] of Object.entries(params)) {
    // If the parameter is active and has a current value, use that value; otherwise, use the default value
    effective[name] = isActive(name) && name in values ? values[name] : definition.default
  }

  // Determine which parameters should be disabled based on enabledWhen rules.
  // A parameter is disabled if it fails any enabledWhen rule that targets it.
  let changed = true // Flag to track if any changes were made in the current iteration

  while (changed) { // Repeat until no new parameters are disabled

    changed = false // Reset the changed flag for this iteration

    for (const validRule of valid) { // Iterate over all valid rules)

      // Only process enabledWhen rules that target parameters not already disabled
      if (validRule.kind !== 'enabledWhen' || disabled.has(validRule.target)) continue

      // If any condition in the rule fails, disable the target parameter and set its effective value to the default
      // Iterate again to check if this change causes other parameters to be disabled in the next iteration
      if (!validRule.when.every(c => check(c, effective))) {

        disabled.add(validRule.target)
        effective[validRule.target] = params[validRule.target].default
        changed = true

      }
    }
  }

  // Determine which parameters are blocked based on maxActive rules.

  for (const validRule of valid) {

    if (validRule.kind !== 'maxActive') continue // Only process maxActive rules

    // Count how many parameters in the rule are currently active and not disabled
    const active = validRule.params.filter(p => active.has(p) && !disabled.has(p))

    // If the number of active parameters is greater than or equal to the maximum allowed, block the remaining parameters
    if (active.length >= validRule.max) {
      validRule.params.filter(p => !active.includes(p)).forEach(p => blocked.add(p)) // Add the remaining parameters to the blocked set
    }

  }

  return { disabled, blocked, effective, broken } // Return the results of the rule evaluation
}
