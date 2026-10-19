<script setup lang="ts">
import type { TableColumnsType } from "ant-design-vue";
import type { Dayjs } from "dayjs";

import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons-vue";
import { useQuery } from "@tanstack/vue-query";
import dayjs from "dayjs";
import { computed, ref, watch } from "vue";

import type { ReportListItem, ReportStatus, ReportViolation } from "@/api/reports";

import { ApiError } from "@/api/client";
import { getReport, getReports } from "@/api/reports";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{ integrationId: string }>();

const authStore = useAuthStore();
const integrationId = computed(() => props.integrationId);

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
const page = ref(1);
const selectedReportId = ref<null | string>(null);

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
  data,
  error: queryError,
  isError,
  isFetching,
  isPending,
  refetch,
} = useQuery({
  queryKey: ["reports", integrationId, statusFilter, fromFilter, toFilter, page],
  queryFn: () =>
    getReports(
      integrationId.value,
      {
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

const listErrorMessage = computed(() => {
  return queryError.value instanceof ApiError ? queryError.value.message : "Не удалось загрузить историю проверок";
});

const detailsErrorMessage = computed(() => {
  return detailsError.value instanceof ApiError ? detailsError.value.message : "Не удалось загрузить проверку";
});

watch([statusFilter, fromFilter, toFilter], () => {
  page.value = 1;
});

function closeReport(): void {
  selectedReportId.value = null;
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
        <a-button size="small" type="text" @click="refetch()">
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
            <a-typography-text code>{{ record.contractSlug ?? record.contractId }}</a-typography-text>
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
          <a-descriptions-item label="Контракт">{{ details.contractSlug ?? "—" }}</a-descriptions-item>
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
.integration-reports-panel__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.integration-reports-panel__mobile-dates {
  display: none;
}

.integration-reports-panel__mobile-date {
  flex: 1;
}

@media (max-width: 575px) {
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
