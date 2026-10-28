<script setup lang="ts">
import type { TableColumnsType } from "ant-design-vue";
import type { Dayjs } from "dayjs";

import { ArrowLeftOutlined, CloseCircleOutlined, DownOutlined, ReloadOutlined } from "@ant-design/icons-vue";
import { useInfiniteQuery, useQuery } from "@tanstack/vue-query";
import { message } from "ant-design-vue";
import dayjs from "dayjs";
import { computed, onBeforeUnmount, ref, watch } from "vue";

import type { ContractSearchItem } from "@/api/contracts";
import type { ReportListItem, ReportStatus, ReportViolation } from "@/api/reports";

import { ApiError } from "@/api/client";
import { searchContracts } from "@/api/contracts";
import { getReport, getReports } from "@/api/reports";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{ integrationId: string }>();

const authStore = useAuthStore();
const integrationId = computed(() => props.integrationId);

const CONTRACT_PAGE_SIZE = 20;
const MAX_CONTRACTS = 50;
const pageSize = 20;

const columns: TableColumnsType<ReportListItem> = [
  { dataIndex: "receivedAt", key: "receivedAt", title: "Время" },
  { key: "status", title: "Результат" },
  { key: "contract", title: "Код контракта" },
  { dataIndex: "contractVersion", key: "contractVersion", title: "Версия контракта" },
  { dataIndex: "violationCount", key: "violationCount", title: "Нарушений" },
];

const detailColumns: TableColumnsType<ReportViolation> = [
  { dataIndex: "fieldName", key: "fieldName", title: "Поле" },
  { dataIndex: "type", key: "type", title: "Нарушение" },
  { key: "expectedType", title: "Ожидаемый тип" },
  { key: "actualType", title: "Фактический тип" },
];

const statusOptions = [
  { label: "Passed", value: "Passed" },
  { label: "Failed", value: "Failed" },
];

const rangePresets = [
  { label: "Сегодня", value: [dayjs().startOf("day"), dayjs().endOf("day")] },
  { label: "Вчера", value: [dayjs().subtract(1, "day").startOf("day"), dayjs().subtract(1, "day").endOf("day")] },
  { label: "Последние 7 дней", value: [dayjs().subtract(6, "day").startOf("day"), dayjs().endOf("day")] },
  { label: "Последние 30 дней", value: [dayjs().subtract(29, "day").startOf("day"), dayjs().endOf("day")] },
];

const statusFilter = ref<ReportStatus | undefined>(undefined);
const fromFilter = ref<Dayjs | undefined>(undefined);
const toFilter = ref<Dayjs | undefined>(undefined);
const contractIds = ref<string[]>([]);
const contractDraftIds = ref<string[]>([]);
const contractSelectOpen = ref(false);
const selectedContracts = ref(new Map<string, ContractSearchItem>());
const contractSearch = ref("");
const debouncedContractSearch = ref("");
const page = ref(1);
const selectedReportId = ref<null | string>(null);
const contractSearchTimer = ref<ReturnType<typeof setTimeout> | undefined>(undefined);

const rangeValue = computed({
  get: (): [Dayjs, Dayjs] | undefined => {
    return fromFilter.value && toFilter.value ? [fromFilter.value, toFilter.value] : undefined;
  },
  set: (value: [Dayjs, Dayjs] | undefined) => {
    fromFilter.value = value?.[0] ?? undefined;
    toFilter.value = value?.[1] ?? undefined;
  },
});

const {
  data: contractPages,
  isError: isContractSearchError,
  isFetching: isContractSearchFetching,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
} = useInfiniteQuery({
  queryKey: ["contract-search", integrationId, debouncedContractSearch],
  queryFn: ({ pageParam }) =>
    searchContracts(
      integrationId.value,
      {
        limit: CONTRACT_PAGE_SIZE,
        offset: pageParam,
        search: debouncedContractSearch.value || undefined,
      },
      authStore.accessToken,
    ),
  initialPageParam: 0,
  getNextPageParam: (lastPage) => {
    const nextOffset = lastPage.offset + lastPage.items.length;
    return nextOffset < lastPage.total ? nextOffset : undefined;
  },
});

const contractItems = computed(() => contractPages.value?.pages.flatMap((page) => page.items) ?? []);
const contractLimitReached = computed(() => contractDraftIds.value.length >= MAX_CONTRACTS);
const isContractSearchDebouncing = computed(() => contractSearch.value.trim() !== debouncedContractSearch.value);
const isContractSearchLoading = computed(
  () => isContractSearchDebouncing.value || (isContractSearchFetching.value && !isFetchingNextPage.value),
);

const contractOptions = computed(() => {
  if (contractSelectOpen.value && isContractSearchLoading.value) {
    return [];
  }

  const options: { disabled: boolean; label: string; slug: string; value: string }[] = [];
  const seen = new Set<string>();
  const selectedIds = new Set(contractDraftIds.value);

  for (const contract of contractItems.value) {
    seen.add(contract.id);
    options.push({
      disabled: contractLimitReached.value && !selectedIds.has(contract.id),
      label: contract.name,
      slug: contract.slug,
      value: contract.id,
    });
  }

  // The dropdown must contain only matching results. Selected labels are added
  // back only while the list is closed so the chips keep their names.
  if (!contractSelectOpen.value) {
    for (const contract of selectedContracts.value.values()) {
      if (!seen.has(contract.id)) {
        options.push({ disabled: false, label: contract.name, slug: contract.slug, value: contract.id });
      }
    }
  }

  return options;
});

const contractNotFoundContent = computed(() => {
  if (isContractSearchLoading.value) {
    return "Загрузка...";
  }

  return isContractSearchError.value ? "Не удалось загрузить контракты" : "Контракты не найдены";
});

const {
  data,
  error: queryError,
  isError,
  isFetching,
  isPending,
  refetch,
} = useQuery({
  queryKey: ["reports", integrationId, contractIds, statusFilter, fromFilter, toFilter, page],
  queryFn: () =>
    getReports(
      integrationId.value,
      {
        contractId: contractIds.value,
        from: fromFilter.value ? fromFilter.value.startOf("day").toISOString() : undefined,
        limit: pageSize,
        offset: (page.value - 1) * pageSize,
        status: statusFilter.value,
        to: toFilter.value ? toFilter.value.endOf("day").toISOString() : undefined,
      },
      authStore.accessToken,
    ),
});

const {
  data: details,
  error: detailsError,
  isError: isDetailsError,
  isPending: isDetailsPending,
  refetch: refetchDetails,
} = useQuery({
  enabled: computed(() => selectedReportId.value !== null),
  queryKey: ["report", integrationId, selectedReportId],
  queryFn: () => getReport(integrationId.value, selectedReportId.value ?? "", authStore.accessToken),
});

const reports = computed(() => data.value?.items ?? []);
const total = computed(() => data.value?.total ?? 0);

function getFieldError(error: unknown, field: string): string | undefined {
  if (!(error instanceof ApiError) || !error.fieldErrors) {
    return undefined;
  }

  const key = Object.keys(error.fieldErrors).find((name) => name.toLowerCase() === field.toLowerCase());
  return key ? error.fieldErrors[key]?.[0] : undefined;
}

const contractFilterError = computed(() =>
  getFieldError(queryError.value, "ContractId") ? "Выберите не больше 50 контрактов" : undefined,
);
const periodFilterError = computed(() =>
  (getFieldError(queryError.value, "From") ?? getFieldError(queryError.value, "To"))
    ? "Проверьте границы периода"
    : undefined,
);

const listErrorMessage = computed(() => {
  if (!(queryError.value instanceof ApiError)) {
    return "Не удалось загрузить историю проверок";
  }

  if (queryError.value.status === 400) {
    return "Проверьте параметры фильтра";
  }
  if (queryError.value.status === 503) {
    return "Не удалось загрузить данные, попробуйте позже";
  }
  return queryError.value.status === 404 ? "Интеграция не найдена" : queryError.value.message;
});

const isValidationError = computed(() => queryError.value instanceof ApiError && queryError.value.status === 400);

const detailsErrorMessage = computed(() => {
  return detailsError.value instanceof ApiError ? detailsError.value.message : "Не удалось загрузить проверку";
});

watch([contractIds, statusFilter, fromFilter, toFilter], () => {
  page.value = 1;
});

watch(contractSearch, (value) => {
  if (contractSearchTimer.value !== undefined) {
    clearTimeout(contractSearchTimer.value);
  }

  contractSearchTimer.value = setTimeout(() => {
    debouncedContractSearch.value = value.trim();
  }, 300);
});

onBeforeUnmount(() => {
  if (contractSearchTimer.value !== undefined) {
    clearTimeout(contractSearchTimer.value);
  }
});

function closeReport(): void {
  selectedReportId.value = null;
}

function contractTagsPlaceholder(omitted: unknown[]): string {
  return `+${omitted.length}`;
}

function emptyContractSelectionLabel(): string {
  return "";
}

function resetContractSearch(): void {
  if (contractSearchTimer.value !== undefined) {
    clearTimeout(contractSearchTimer.value);
    contractSearchTimer.value = undefined;
  }

  contractSearch.value = "";
  debouncedContractSearch.value = "";
}

function onContractDropdownVisibleChange(isOpen: boolean): void {
  contractSelectOpen.value = isOpen;

  if (!isOpen) {
    applyContractFilter();
  }
}

function onContractBlur(): void {
  contractSelectOpen.value = false;
  resetContractSearch();
  applyContractFilter();
}

function clearSelectedContracts(): void {
  contractDraftIds.value = [];
  selectedContracts.value = new Map();
  contractIds.value = [];
}

function applyContractFilter(): void {
  const current = contractIds.value;
  const next = contractDraftIds.value;
  if (current.length === next.length && current.every((id, index) => id === next[index])) {
    return;
  }

  contractIds.value = [...next];
}

function preventFocus(event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

function onContractPopupScroll(event: UIEvent): void {
  const target = event.target as HTMLElement | null;
  if (!target || !hasNextPage.value || isFetchingNextPage.value) {
    return;
  }

  const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
  if (distanceToBottom <= 8) {
    void fetchNextPage();
  }
}

function onContractSearch(value: string): void {
  contractSearch.value = value;
}

function onContractsChange(value: unknown): void {
  let values = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  if (values.length > MAX_CONTRACTS) {
    values = values.slice(0, MAX_CONTRACTS);
    message.warning("Можно выбрать не больше 50 контрактов");
  }

  contractDraftIds.value = values;

  const knownContracts = new Map<string, ContractSearchItem>();
  const found = contractItems.value;

  for (const contract of selectedContracts.value.values()) {
    knownContracts.set(contract.id, contract);
  }
  for (const contract of found) {
    knownContracts.set(contract.id, contract);
  }

  const next = new Map<string, ContractSearchItem>();
  for (const id of values) {
    const contract = knownContracts.get(id);
    if (contract) {
      next.set(id, contract);
    }
  }

  selectedContracts.value = next;

  if (!contractSelectOpen.value) {
    applyContractFilter();
  }
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function onPageChange(value: number): void {
  page.value = value;
}

function openReport(record: ReportListItem): void {
  selectedReportId.value = record.reportId;
}

function rowProps(record: ReportListItem): { onClick: () => void } {
  return { onClick: () => openReport(record) };
}

function violationRowKey(_record: ReportViolation, index?: number): number {
  return index ?? 0;
}
</script>

<template>
  <a-card v-if="!selectedReportId" title="История проверок">
    <div class="integration-reports-panel__filters">
      <div class="integration-reports-panel__contracts-wrap">
        <div class="integration-reports-panel__contracts-row">
          <a-select
            v-model:value="contractDraftIds"
            :class="{ 'integration-reports-panel__contracts--open': contractSelectOpen }"
            class="integration-reports-panel__contracts"
            :auto-clear-search-value="false"
            :filter-option="false"
            :list-item-height="44"
            :loading="isContractSearchFetching"
            :max-tag-count="contractSelectOpen ? 0 : 1"
            :max-tag-placeholder="contractSelectOpen ? emptyContractSelectionLabel : contractTagsPlaceholder"
            :max-tag-text-length="18"
            :not-found-content="contractNotFoundContent"
            :options="contractOptions"
            mode="multiple"
            placeholder="Контракты"
            placement="bottomLeft"
            popup-class-name="integration-reports-panel__contracts-dropdown"
            :search-value="contractSearch"
            show-arrow
            show-search
            :dropdown-align="{ overflow: { adjustY: false } }"
            @blur="onContractBlur"
            @change="onContractsChange"
            @dropdown-visible-change="onContractDropdownVisibleChange"
            @popup-scroll="onContractPopupScroll"
            @search="onContractSearch"
          >
            <template #suffixIcon>
              <DownOutlined />
            </template>
            <template #option="{ label, slug, value }">
              <a-checkbox
                class="integration-reports-panel__contract-checkbox"
                :checked="contractDraftIds.includes(String(value))"
                :disabled="contractLimitReached && !contractDraftIds.includes(String(value))"
              >
                <span class="integration-reports-panel__contract-option">
                  <span class="integration-reports-panel__contract-name">{{ label }}</span>
                  <a-typography-text class="integration-reports-panel__contract-slug" type="secondary">
                    {{ slug }}
                  </a-typography-text>
                </span>
              </a-checkbox>
            </template>
          </a-select>
          <a-tooltip title="Очистить выбранные контракты">
            <a-button
              aria-label="Очистить выбранные контракты"
              class="integration-reports-panel__contracts-clear"
              :disabled="contractDraftIds.length === 0"
              @mousedown="preventFocus"
              @click="clearSelectedContracts"
            >
              <template #icon>
                <CloseCircleOutlined />
              </template>
            </a-button>
          </a-tooltip>
        </div>
        <a-typography-text v-if="contractLimitReached" class="integration-reports-panel__filter-hint" type="secondary">
          Можно выбрать не больше 50 контрактов
        </a-typography-text>
        <a-typography-text v-if="contractFilterError" class="integration-reports-panel__filter-error" type="danger">
          {{ contractFilterError }}
        </a-typography-text>
      </div>
      <a-select
        v-model:value="statusFilter"
        allow-clear
        placeholder="Результат"
        :options="statusOptions"
        style="width: 140px"
      />
      <a-range-picker
        v-model:value="rangeValue"
        class="integration-reports-panel__desktop-range"
        format="DD.MM.YYYY"
        :presets="rangePresets"
      />
      <div class="integration-reports-panel__mobile-dates">
        <a-date-picker
          v-model:value="fromFilter"
          class="integration-reports-panel__mobile-date"
          format="DD.MM.YYYY"
          placeholder="Начальная дата"
        />
        <a-date-picker
          v-model:value="toFilter"
          class="integration-reports-panel__mobile-date"
          format="DD.MM.YYYY"
          placeholder="Конечная дата"
        />
      </div>
      <a-typography-text v-if="periodFilterError" class="integration-reports-panel__filter-error" type="danger">
        {{ periodFilterError }}
      </a-typography-text>
      <a-button :loading="isFetching" @click="refetch()">
        <template #icon>
          <ReloadOutlined />
        </template>
        Обновить
      </a-button>
    </div>

    <a-alert
      v-if="isError"
      :description="listErrorMessage"
      message="Не удалось загрузить историю проверок"
      show-icon
      type="error"
    >
      <template #action>
        <a-button v-if="!isValidationError" size="small" type="text" @click="refetch()">
          <template #icon>
            <ReloadOutlined />
          </template>
          Повторить
        </a-button>
      </template>
    </a-alert>

    <template v-else>
      <a-table
        class="integration-reports-panel__table"
        :columns="columns"
        :custom-row="rowProps"
        :data-source="reports"
        :loading="isPending"
        :pagination="false"
        :scroll="{ x: 800 }"
        row-key="reportId"
      >
        <template #emptyText>
          <a-empty description="Проверок пока нет" />
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'receivedAt'">
            {{ formatDateTime(record.receivedAt) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.status === 'Passed' ? 'success' : 'error'">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'contract'">
            <a-typography-text code>{{
              record.contractSlug ?? record.contractName ?? "Контракт удалён"
            }}</a-typography-text>
          </template>
        </template>
      </a-table>

      <a-pagination
        v-if="total > pageSize"
        class="integration-reports-panel__pagination"
        :current="page"
        :page-size="pageSize"
        :show-size-changer="false"
        :total="total"
        @change="onPageChange"
      />
    </template>
  </a-card>

  <template v-else>
    <a-button class="integration-reports-panel__back" type="text" @click="closeReport">
      <template #icon>
        <ArrowLeftOutlined />
      </template>
      К истории
    </a-button>

    <a-card title="Детали проверки">
      <a-alert
        v-if="isDetailsError"
        :description="detailsErrorMessage"
        message="Не удалось загрузить проверку"
        show-icon
        type="error"
      >
        <template #action>
          <a-button size="small" type="text" @click="refetchDetails()">
            <template #icon>
              <ReloadOutlined />
            </template>
            Повторить
          </a-button>
        </template>
      </a-alert>

      <a-skeleton v-else-if="isDetailsPending" active :paragraph="{ rows: 4 }" />

      <template v-else-if="details">
        <a-descriptions :column="2" size="small">
          <a-descriptions-item label="Время">{{ formatDateTime(details.receivedAt) }}</a-descriptions-item>
          <a-descriptions-item label="Результат">
            <a-tag :color="details.status === 'Passed' ? 'success' : 'error'">{{ details.status }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="Контракт">
            {{ details.contractSlug ?? details.contractName ?? "Контракт удалён" }}
          </a-descriptions-item>
          <a-descriptions-item label="Версия контракта">{{ details.contractVersion }}</a-descriptions-item>
          <a-descriptions-item label="Нарушений">{{ details.violationCount }}</a-descriptions-item>
        </a-descriptions>

        <a-divider />

        <a-table
          v-if="details.violations.length > 0"
          :columns="detailColumns"
          :data-source="details.violations"
          :pagination="false"
          :row-key="violationRowKey"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'expectedType'">
              {{ record.expectedType ?? "—" }}
            </template>
            <template v-else-if="column.key === 'actualType'">
              {{ record.actualType ?? "—" }}
            </template>
          </template>
        </a-table>
        <a-alert v-else message="Нарушений нет" show-icon type="success" />
      </template>
    </a-card>
  </template>
</template>

<style scoped>
:global(.integration-reports-panel__contracts-dropdown .ant-select-item-option-state) {
  display: none;
}

.integration-reports-panel__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.integration-reports-panel__contracts-wrap {
  width: 240px;
}

.integration-reports-panel__contracts-row {
  align-items: center;
  display: flex;
}

.integration-reports-panel__contracts {
  flex: 1;
  min-width: 0;
}

.integration-reports-panel__contracts :deep(.ant-select-selector) {
  border-bottom-right-radius: 0;
  border-top-right-radius: 0;
}

.integration-reports-panel__contracts--open :deep(.ant-select-selection-item) {
  display: none;
}

.integration-reports-panel__contracts-clear {
  border-bottom-left-radius: 0;
  border-top-left-radius: 0;
  flex: none;
  margin-left: -1px;
  padding-inline: 7px;
}

.integration-reports-panel__contracts :deep(.ant-select-selection-overflow) {
  flex-wrap: nowrap;
  overflow: hidden;
}

.integration-reports-panel__contract-checkbox {
  pointer-events: none;
}

.integration-reports-panel__contract-option {
  display: inline-flex;
  flex-direction: column;
  line-height: 1.25;
  max-width: 190px;
  min-width: 0;
  vertical-align: middle;
}

.integration-reports-panel__contract-name,
.integration-reports-panel__contract-slug {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.integration-reports-panel__contract-slug {
  font-size: 12px;
  line-height: 1.2;
}

.integration-reports-panel__filter-hint,
.integration-reports-panel__filter-error {
  display: block;
  margin-top: 4px;
  font-size: 12px;
}

.integration-reports-panel__filters > .integration-reports-panel__filter-error {
  flex-basis: 100%;
}

.integration-reports-panel__mobile-dates {
  display: none;
}

.integration-reports-panel__mobile-date {
  flex: 1;
}

@media (max-width: 575px) {
  .integration-reports-panel__contracts-wrap {
    width: 100%;
  }

  .integration-reports-panel__desktop-range {
    display: none;
  }

  .integration-reports-panel__mobile-dates {
    display: flex;
    flex: 1 1 100%;
    gap: 12px;
  }
}

.integration-reports-panel__table :deep(.ant-table-row) {
  cursor: pointer;
}

.integration-reports-panel__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.integration-reports-panel__back {
  margin-bottom: 8px;
  padding-inline: 0;
}
</style>
