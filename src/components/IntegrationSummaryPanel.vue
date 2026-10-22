<script setup lang="ts">
import type { TableColumnsType } from "ant-design-vue";

import { ReloadOutlined } from "@ant-design/icons-vue";
import { useQuery } from "@tanstack/vue-query";
import { theme } from "ant-design-vue";
import { computed } from "vue";

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

const {
  data,
  error: queryError,
  isError,
  isFetching,
  isPending,
  refetch,
} = useQuery({
  queryKey: ["integration-summary", integrationId],
  queryFn: () => getIntegrationSummary(integrationId.value, authStore.accessToken),
});

const summary = computed(() => data.value);
const groups = computed(() => summary.value?.latestViolationGroups ?? []);

const errorMessage = computed(() => {
  if (queryError.value instanceof ApiError) {
    return queryError.value.status === 503 ? "Сервис проверок недоступен, попробуйте позже" : queryError.value.message;
  }
  return "Не удалось загрузить сводку";
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
  <a-card title="Сводка">
    <template #extra>
      <a-button :loading="isFetching" @click="refetch()">
        <template #icon>
          <ReloadOutlined />
        </template>
        Обновить
      </a-button>
    </template>

    <a-alert v-if="isError" :description="errorMessage" message="Не удалось загрузить сводку" show-icon type="error">
      <template #action>
        <a-button size="small" type="text" @click="refetch()">
          <template #icon>
            <ReloadOutlined />
          </template>
          Повторить
        </a-button>
      </template>
    </a-alert>

    <a-skeleton v-else-if="isPending" active :paragraph="{ rows: 4 }" />

    <template v-else-if="summary">
      <a-row :gutter="[16, 16]">
        <a-col :lg="6" :sm="12" :xs="24">
          <a-statistic title="Всего проверок" :value="summary.totalReports" />
        </a-col>
        <a-col :lg="6" :sm="12" :xs="24">
          <a-statistic title="Passed" :value="summary.passedReports" :value-style="{ color: token.colorSuccess }" />
        </a-col>
        <a-col :lg="6" :sm="12" :xs="24">
          <a-statistic title="Failed" :value="summary.failedReports" :value-style="{ color: token.colorError }" />
        </a-col>
        <a-col :lg="6" :sm="12" :xs="24">
          <a-statistic title="Групп нарушений" :value="summary.violationGroupCount" />
        </a-col>
      </a-row>

      <a-divider />

      <div class="integration-summary-panel__last">
        <a-typography-text type="secondary">Последняя проверка: </a-typography-text>
        <a-typography-text>
          {{ summary.lastReceivedAt ? formatDateTime(summary.lastReceivedAt) : "Проверок пока нет" }}
        </a-typography-text>
      </div>

      <a-typography-title class="integration-summary-panel__title" :level="5"> Последние группы </a-typography-title>

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
    </template>
  </a-card>
</template>

<style scoped>
.integration-summary-panel__last {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.integration-summary-panel__title {
  margin-bottom: 16px;
  margin-top: 24px;
}
</style>
