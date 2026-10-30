<script setup lang="ts">
import type { TableColumnsType } from "ant-design-vue";
import type { Dayjs } from "dayjs";

import { ReloadOutlined } from "@ant-design/icons-vue";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { theme } from "ant-design-vue";
import dayjs from "dayjs";
import { computed, ref } from "vue";

import type { ViolationGroup } from "@/api/violation-groups";

import { ApiError } from "@/api/client";
import { getIntegrationSummary } from "@/api/summary";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{ integrationId: string }>();

const authStore = useAuthStore();
const integrationId = computed(() => props.integrationId);
const { token } = theme.useToken();

const columns: TableColumnsType<ViolationGroup> = [
  { dataIndex: "fieldName", key: "fieldName", title: "Поле" },
  { dataIndex: "type", key: "type", title: "Нарушение" },
  { key: "contract", title: "Код контракта" },
  { dataIndex: "contractVersion", key: "contractVersion", title: "Версия контракта" },
  { dataIndex: "occurrenceCount", key: "occurrenceCount", title: "Повторов" },
  { key: "lastSeenAt", title: "Последнее появление" },
];

const rangePresets = [
  {
    label: "Сегодня",
    value: [dayjs().startOf("day"), dayjs().startOf("day")],
  },
  {
    label: "Последние 7 дней",
    value: [dayjs().subtract(6, "day").startOf("day"), dayjs().startOf("day")],
  },
  {
    label: "Последние 30 дней",
    value: [dayjs().subtract(29, "day").startOf("day"), dayjs().startOf("day")],
  },
  {
    label: "Всё время",
    value: null as unknown as [Dayjs, Dayjs],
  },
];

const selectedRange = ref<[Dayjs, Dayjs] | undefined>([dayjs().startOf("day"), dayjs().startOf("day")]);
const hasPeriod = computed(() => Boolean(selectedRange.value?.[0] && selectedRange.value[1]));

const periodQuery = computed(() => {
  if (!hasPeriod.value) {
    return {};
  }

  const firstDay = selectedRange.value?.[0];
  const lastDay = selectedRange.value?.[1];
  if (!firstDay || !lastDay) {
    return {};
  }

  return {
    from: firstDay.startOf("day").toISOString(),
    to: lastDay.startOf("day").add(1, "day").toISOString(),
  };
});

const {
  data,
  error: queryError,
  isError,
  isFetching,
  isPending,
  refetch,
} = useQuery({
  queryKey: ["integration-summary", integrationId, periodQuery],
  queryFn: () => getIntegrationSummary(integrationId.value, periodQuery.value, authStore.accessToken),
  placeholderData: keepPreviousData,
});

const summary = computed(() => data.value);
const groups = computed(() => summary.value?.latestViolationGroups ?? []);
const isPeriodEmpty = computed(() => hasPeriod.value && summary.value?.totalReports === 0);

function getFieldError(error: unknown, field: string): string | undefined {
  if (!(error instanceof ApiError) || !error.fieldErrors) {
    return undefined;
  }

  const key = Object.keys(error.fieldErrors).find((name) => name.toLowerCase() === field.toLowerCase());
  return key ? error.fieldErrors[key]?.[0] : undefined;
}

const periodFilterError = computed(() =>
  (getFieldError(queryError.value, "From") ?? getFieldError(queryError.value, "To"))
    ? "Проверьте границы периода"
    : undefined,
);
const isValidationError = computed(() => queryError.value instanceof ApiError && queryError.value.status === 400);

const errorMessage = computed(() => {
  if (!(queryError.value instanceof ApiError)) {
    return "Не удалось загрузить сводку";
  }

  if (queryError.value.status === 400) {
    return "Проверьте параметры периода";
  }
  if (queryError.value.status === 503) {
    return "Не удалось загрузить данные, попробуйте позже";
  }
  return queryError.value.status === 404 ? "Интеграция не найдена" : queryError.value.message;
});

const lastCheckText = computed(() => {
  if (!summary.value) {
    return "";
  }

  if (summary.value.lastReceivedAt) {
    return formatDateTime(summary.value.lastReceivedAt);
  }

  return hasPeriod.value ? "За выбранный период проверок нет" : "Проверок пока нет";
});

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
</script>

<template>
  <div class="integration-summary-panel__actions">
    <a-button :loading="isFetching" @click="refetch()">
      <template #icon>
        <ReloadOutlined />
      </template>
      Обновить
    </a-button>
  </div>

  <a-card class="integration-summary-panel__checks-card" title="Проверки">
    <div class="integration-summary-panel__period">
      <a-range-picker
        v-model:value="selectedRange"
        class="integration-summary-panel__range-picker"
        format="DD.MM.YYYY"
        :placeholder="['Начальная дата', 'Конечная дата']"
        :presets="rangePresets"
      />
    </div>

    <a-typography-text v-if="periodFilterError" class="integration-summary-panel__period-error" type="danger">
      {{ periodFilterError }}
    </a-typography-text>

    <a-alert v-if="isError" :description="errorMessage" message="Не удалось загрузить сводку" show-icon type="error">
      <template #action>
        <a-button v-if="!isValidationError" size="small" type="text" @click="refetch()">
          <template #icon>
            <ReloadOutlined />
          </template>
          Повторить
        </a-button>
      </template>
    </a-alert>

    <a-skeleton v-else-if="isPending" active :paragraph="{ rows: 4 }" />

    <template v-else-if="summary">
      <a-alert
        v-if="isPeriodEmpty && !isFetching"
        class="integration-summary-panel__period-empty"
        message="За выбранный период проверок нет"
        show-icon
        type="info"
      />

      <a-row :gutter="[16, 16]">
        <a-col :lg="8" :sm="8" :xs="24">
          <a-statistic title="Всего проверок" :value="summary.totalReports" />
        </a-col>
        <a-col :lg="8" :sm="8" :xs="24">
          <a-statistic title="Passed" :value="summary.passedReports" :value-style="{ color: token.colorSuccess }" />
        </a-col>
        <a-col :lg="8" :sm="8" :xs="24">
          <a-statistic title="Failed" :value="summary.failedReports" :value-style="{ color: token.colorError }" />
        </a-col>
      </a-row>

      <a-divider />

      <div class="integration-summary-panel__last">
        <a-typography-text type="secondary">
          {{ hasPeriod ? "Последняя проверка за период:" : "Последняя проверка:" }}
        </a-typography-text>
        <a-typography-text>{{ lastCheckText }}</a-typography-text>
      </div>
    </template>
  </a-card>

  <a-card v-if="summary" class="integration-summary-panel__groups-card" title="Последние группы">
    <a-table
      :columns="columns"
      :data-source="groups"
      :pagination="false"
      :scroll="{ x: 760 }"
      row-key="groupId"
      size="small"
    >
      <template #emptyText>
        <a-empty description="Групп нарушений пока нет" />
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'type'">
          <a-tag>{{ record.type }}</a-tag>
        </template>
        <template v-else-if="column.key === 'contract'">
          <a-typography-text code>{{ record.contractSlug ?? record.contractId }}</a-typography-text>
        </template>
        <template v-else-if="column.key === 'lastSeenAt'">
          {{ formatDateTime(record.lastSeenAt) }}
        </template>
      </template>
    </a-table>
  </a-card>
</template>

<style scoped>
.integration-summary-panel__actions {
  align-items: center;
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
  padding: 0;
}

.integration-summary-panel__checks-card {
  margin-bottom: 8px;
}

.integration-summary-panel__period {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.integration-summary-panel__range-picker {
  width: 280px;
}

.integration-summary-panel__period-error {
  display: block;
  margin-bottom: 12px;
  margin-top: -4px;
}

.integration-summary-panel__period-empty {
  margin-bottom: 16px;
}

.integration-summary-panel__last {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

@media (max-width: 575px) {
  .integration-summary-panel__range-picker {
    width: 100%;
  }
}
</style>
