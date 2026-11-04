<script lang="ts" setup>
import { ref, computed, watch, defineProps } from 'vue'
import { RULE_KINDS, type RuleKind, evaluateRules, type Condition, OPERATORS, OPERATORS_MAP } from '@/services/rules_service'
import Button from 'primevue/button';
import SplitButton from 'primevue/splitbutton';
import InputText from 'primevue/inputtext';
import ToggleSwitch from 'primevue/toggleswitch';
import MultiSelect from 'primevue/multiselect';
import Tag from 'primevue/tag';
import Select from 'primevue/select';
import { type SlideSection } from '@/services/slide_service'
import '@/assets/main.css'

const props = defineProps<{
    section: SlideSection
}>()

const rules = computed(() => props.section.rules || [])

const newRule = (kind: RuleKind) => kind === 'enabledWhen' ? { id: crypto.randomUUID(), kind, target: '', when: [] } : { id: crypto.randomUUID(), kind, params: [], max: 1 }
const addRule = (kind: RuleKind) => {
    const rule = newRule(kind)
    props.section.rules = [...(props.section.rules || []), rule] // Add the new rule to the section's rules and force reactivity
}
const removeRule = (ruleId: string) => {
    props.section.rules = rules.value.filter(r => r.id !== ruleId)
}

function newCondition(): Condition {
    return { param: '', op: 'eq', value: '' }
}

function initConditions(rule: any) {
    if (rule.kind === 'enabledWhen' && (!rule.when || rule.when.length === 0)) {
        rule.when = [newCondition()]
    }
}

function addCondition(rule: any) {
    if (rule.kind === 'enabledWhen') {
        rule.when.push(newCondition())
    }
}

const parameterOptions = computed(() => {
    return props.section.parameters ? Object.keys(props.section.parameters).map(paramName => ({ label: paramName, value: paramName })) : []
})

const operatorOptionsForParamType = (paramType: string) => {

    const ops = {
        'string': ['eq', 'neq'],
        'number': ['eq', 'neq', 'gt', 'lt'],
        'boolean': ['eq', 'neq'],
        'select': ['eq', 'neq']
    }

    const allowedOps = ops[paramType] || ['eq', 'neq']
    return allowedOps.map(op => ({ label: OPERATORS_MAP[op].label, value: op, symbol: OPERATORS_MAP[op].symbol }))

}

const paramOf = (name: string) => props.section.parameters?.[name]

const brokenRules = computed(() =>
    evaluateRules(props.section.parameters ?? {}, rules.value, {}, new Set()).broken
)
</script>



<template>

    <!-- Header -->
    <div class="rulebuilder-header">

        <SplitButton size="small" label="Add rule"
            :model="RULE_KINDS.map(kind => ({ label: kind, command: () => addRule(kind) }))"
            @click="addRule('enabledWhen')">

            <template #icon>
                <i class="material-symbols-outlined">add</i>
            </template>
            <template #item="{ item }">
                <Tag style="margin: var(--space-small)" class="rule-kind">{{ item.label }}</Tag>
            </template>

        </SplitButton>

    </div>

    <!-- Rules -->
    <div class="rules-container">
        <!-- Rule -->
        <div v-for="rule in rules" :key="rule.id" class="rule-item">

            <div class="rule-item-header">
                <Tag class="rule-kind" :severity="brokenRules.has(rule.id) ? 'danger' : 'success'">{{ rule.kind }}</Tag>
                <Button size="small" outlined class="remove-rule-btn" @click="removeRule(rule.id)">
                    <template #icon>
                        <i style="font-size: var(--fs-medium)" class="material-symbols-outlined">close</i>
                    </template>
                </Button>
            </div>

            <div class="rule-body">

                <span v-if="rule.kind === 'enabledWhen'">

                    <div class="rule-enable-row">
                        <span class="rule-text">Enable</span>

                        <Select size="small" v-model="rule.target" :options="parameterOptions" option-label="label"
                            option-value="value" placeholder="parameter" @select="initConditions(rule)"
                            @change="initConditions(rule)">
                            <template #option="{ option }">
                                <Tag class="rule-kind">{{ option.label }}</Tag>
                            </template>
                            <template #value="{ value, placeholder }">
                                <Tag v-if="value" class="rule-kind">{{ value }}</Tag>
                                <span v-else>{{ placeholder }}</span>
                            </template>
                        </Select>

                    </div>

                    <div class="condition-container">

                        <div v-for="(condition, index) in rule.when" :key="index" class="condition-row">

                            <span class="rule-text">{{ index === 0 ? 'when' : 'and' }}</span>

                            <div class="condition-row-controls-container">

                                <div class="condition-row-controls">
                                    <!-- Condition Parameter -->
                                    <Select size="small"
                                        :options="parameterOptions.filter(po => po.value !== rule.target)"
                                        v-model="condition.param" option-label="label" option-value="value"
                                        placeholder="parameter">
                                        <template #option="{ option }">
                                            <Tag class="rule-kind">{{ option.label }}</Tag>
                                        </template>
                                        <template #value="{ value, placeholder }">
                                            <Tag v-if="value" class="rule-kind">{{ value }}</Tag>
                                            <span v-else>{{ placeholder }}</span>
                                        </template>
                                    </Select>

                                    <!-- Condition Operator -->
                                    <Select size="small" v-model="condition.op"
                                        :options="operatorOptionsForParamType(paramOf(condition.param)?.type)"
                                        option-label="label" option-value="value" placeholder="?">
                                        <template #option="{ option }">
                                            <Tag class="rule-kind">{{ option.symbol }}</Tag>
                                        </template>
                                        <template #value="{ value, placeholder }">
                                            <Tag v-if="value" class="rule-kind">{{ OPERATORS_MAP[value].symbol }}</Tag>
                                            <span v-else>{{ placeholder }}</span>
                                        </template>
                                    </Select>

                                    <span v-if="paramOf(condition.param)">

                                        <!-- Condition Value -->
                                        <!-- if parameter type is select, show a select dropdown with the options, otherwise show a text input -->
                                        <Select v-if="paramOf(condition.param)?.type === 'select'" size="small"
                                            v-model="condition.value"
                                            :options="paramOf(condition.param)?.options.map(o => ({ label: o, value: o }))"
                                            placeholder="value" option-label="label" option-value="value">

                                            <template #option="{ option }">
                                                <Tag class="rule-kind">{{ option.label }}</Tag>
                                            </template>

                                            <template #value="{ value, placeholder }">
                                                <Tag v-if="value" class="rule-kind">{{ value.label }}</Tag>
                                                <span v-else class="rule-kind">{{ placeholder }}</span>
                                            </template>
                                        </Select>

                                        <!-- if parameter type is number, show a number input -->
                                        <InputText v-else-if="paramOf(condition.param)?.type === 'number'" type="number"
                                            size="small" v-model.number="condition.value" placeholder="value" />

                                        <!-- if parameter type is boolean, show a toggleswitch -->
                                        <div v-else-if="paramOf(condition.param)?.type === 'boolean'"
                                            style="display: flex; align-items: center; gap: var(--space-small);">
                                            <ToggleSwitch v-model="condition.value" />
                                            <div class="boolean-text">{{ condition.value ? 'Yes' : 'No' }}</div>
                                        </div>

                                        <!-- if parameter type is string, show a text input -->
                                        <InputText v-else-if="paramOf(condition.param)?.type === 'string'" type="text"
                                            size="small" v-model="condition.value" placeholder="value" />
                                    </span>
                                </div>

                                <Button size="small" outlined class="remove-rule-btn"
                                    @click="rule.when.splice(index, 1)">
                                    <template #icon>
                                        <i style="font-size: var(--fs-medium)"
                                            class="material-symbols-outlined">close</i>
                                    </template>
                                </Button>
                            </div>

                        </div>

                        <Button label="Add condition" size="small" outlined class="add-condition-btn"
                            @click="addCondition(rule)">
                            <template #icon>
                                <i class="material-symbols-outlined">add</i>
                            </template>
                        </Button>
                    </div>

                </span>

                <span v-else-if="rule.kind === 'maxActive'">

                    <div class="rule-enable-row">
                        <span class="rule-text">At most</span>
                        <InputText type="number" size="small" placeholder="max" v-model.number="rule.max" :min="1"
                            :max="rule.params.length || 1" />
                        <span class="rule-text">of</span>
                        <MultiSelect v-model="rule.params" :options="parameterOptions" optionLabel="label"
                            optionValue="value" display="chip" placeholder="parameters" class="parameter-multiselect" />
                    </div>
                </span>

            </div>

        </div>
    </div>

</template>


<style scoped>
.rulebuilder-header {
    display: flex;
    justify-content: flex-end;
}

.rules-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-small);
}

.rule-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-small);
    width: 100%;
    padding: var(--space-small);
    background-color: var(--surface);
    border-radius: var(--br-medium);
    box-shadow: var(--shadow-light);
    border: 1px solid var(--p-primary-200);
}

.rule-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: var(--space-small);
    border-bottom: 1px solid var(--p-primary-200);
    padding-bottom: var(--space-small);
}

.remove-rule-btn {
    padding: calc(var(--space-small) / 2);
    width: 1.5rem;
    height: 1.5rem;
}

.rule-kind {
    font-size: var(--fs-small);
    font-weight: bold !important;
    text-transform: lowercase;
    font-family: "Fira Code";
    cursor: pointer;
}

.rule-enable-row {
    display: flex;
    align-items: center;
    gap: var(--space-small);
    margin-bottom: var(--space-small);
}

.rule-text {
    font-size: var(--fs-small);
    font-weight: bold !important;
    text-transform: lowercase;
    font-family: "Fira Code";
}

.condition-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--space-small);
    margin-left: var(--space-medium);
    padding: var(--space-small);
    border-left: 2px solid var(--p-primary-200);
    margin-bottom: var(--space-small);
}

.condition-row-controls-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-small);
}

.condition-row-controls {
    display: grid;
    grid-template-columns: 4fr 1fr 4fr;
    align-items: center;
    gap: var(--space-small);
}

.boolean-text {
    font-family: "Fira Code";
    font-weight: bold;
    font-size: var(--fs-small);
    border: 2px solid var(--p-primary-200);
    padding: var(--space-small);
    border-radius: var(--br-small);
    color: var(--p-primary-500);
    width: 80px;
    text-align: center;
}

.add-condition-btn {
    margin-left: var(--space-medium);
    margin-top: var(--space-small);
    font-size: var(--fs-small);
}

.parameter-multiselect {
    width: 100%;
    max-width: 300px;
}
</style>