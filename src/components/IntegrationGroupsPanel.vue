<script setup lang="ts">
import type { TableColumnsType } from "ant-design-vue";

import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons-vue";
import { useQuery } from "@tanstack/vue-query";
import { theme } from "ant-design-vue";
import { computed, ref } from "vue";

import type { ViolationGroup } from "@/api/violation-groups";

import { ApiError } from "@/api/client";
import { getViolationGroup, getViolationGroups } from "@/api/violation-groups";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{ integrationId: string }>();

const authStore = useAuthStore();
const { token } = theme.useToken();
const integrationId = computed(() => props.integrationId);

const pageSize = 20;

const columns: TableColumnsType<ViolationGroup> = [
  { dataIndex: "fieldName", key: "fieldName", title: "Поле" },
  { dataIndex: "type", key: "type", title: "Нарушение" },
  { key: "contract", title: "Код контракта" },
  { key: "lastSeenAt", title: "Последнее появление" },
  { dataIndex: "contractVersion", key: "contractVersion", title: "Версия контракта" },
  { dataIndex: "occurrenceCount", key: "occurrenceCount", title: "Повторов" },
];

const page = ref(1);
const selectedGroupId = ref<null | string>(null);

const {
  data,
  error: queryError,
  isError,
  isFetching,
  isPending,
  refetch,
} = useQuery({
  queryKey: ["violation-groups", integrationId, page],
  queryFn: () =>
    getViolationGroups(
      integrationId.value,
      {
        limit: pageSize,
        offset: (page.value - 1) * pageSize,
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
  enabled: computed(() => selectedGroupId.value !== null),
  queryKey: ["violation-group", integrationId, selectedGroupId],
  queryFn: () => getViolationGroup(integrationId.value, selectedGroupId.value ?? "", authStore.accessToken),
});

const groups = computed(() => data.value?.items ?? []);
const total = computed(() => data.value?.total ?? 0);

const listErrorMessage = computed(() => {
  return queryError.value instanceof ApiError ? queryError.value.message : "Не удалось загрузить группы нарушений";
});

const detailsErrorMessage = computed(() => {
  return detailsError.value instanceof ApiError ? detailsError.value.message : "Не удалось загрузить группу";
});

function closeGroup(): void {
  selectedGroupId.value = null;
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

function openGroup(record: ViolationGroup): void {
  selectedGroupId.value = record.groupId;
}

function rowProps(record: ViolationGroup): { onClick: () => void } {
  return { onClick: () => openGroup(record) };
}
</script>

<template>
  <div v-if="!selectedGroupId" class="integration-groups-panel__actions">
    <a-button :loading="isFetching" @click="refetch()">
      <template #icon>
        <ReloadOutlined />
      </template>
      Обновить
    </a-button>
  </div>

  <a-card v-if="!selectedGroupId">
    <a-alert
      v-if="isError"
      :description="listErrorMessage"
      message="Не удалось загрузить группы нарушений"
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
        class="integration-groups-panel__table"
        :columns="columns"
        :custom-row="rowProps"
        :data-source="groups"
        :loading="isPending"
        :pagination="false"
        :scroll="{ x: 760 }"
        row-key="groupId"
      >
        <template #emptyText>
          <a-empty description="Групп нарушений пока нет" />
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'contract'">
            <a-typography-text code>{{ record.contractSlug ?? record.contractId }}</a-typography-text>
          </template>
          <template v-else-if="column.key === 'lastSeenAt'">
            {{ formatDateTime(record.lastSeenAt) }}
          </template>
        </template>
      </a-table>

      <a-pagination
        v-if="total > pageSize"
        class="integration-groups-panel__pagination"
        :current="page"
        :page-size="pageSize"
        :show-size-changer="false"
        :total="total"
        @change="onPageChange"
      />
    </template>
  </a-card>

  <template v-else>
    <a-button class="integration-groups-panel__back" type="text" @click="closeGroup">
      <template #icon>
        <ArrowLeftOutlined />
      </template>
      К группам
    </a-button>

    <a-card title="Детали группы">
      <a-alert
        v-if="isDetailsError"
        :description="detailsErrorMessage"
        message="Не удалось загрузить группу"
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
        <div class="integration-groups-panel__head">
          <div class="integration-groups-panel__head-main">
            <a-typography-title class="integration-groups-panel__field" :level="4">
              {{ details.fieldName }}
            </a-typography-title>
            <a-tag>{{ details.type }}</a-tag>
          </div>
          <div class="integration-groups-panel__meta">
            <a-typography-text code>{{ details.contractSlug ?? "—" }}</a-typography-text>
            <span class="integration-groups-panel__version" :style="{ color: token.colorText }">
              v{{ details.contractVersion }}
            </span>
          </div>
        </div>

        <a-row class="integration-groups-panel__stats" :gutter="16">
          <a-col :sm="8" :xs="24">
            <a-statistic title="Повторов" :value="details.occurrenceCount" />
          </a-col>
          <a-col :sm="8" :xs="24">
            <a-statistic
              class="integration-groups-panel__stat-date"
              title="Впервые"
              :value="formatDateTime(details.firstSeenAt)"
            />
          </a-col>
          <a-col :sm="8" :xs="24">
            <a-statistic
              class="integration-groups-panel__stat-date"
              title="Последнее"
              :value="formatDateTime(details.lastSeenAt)"
            />
          </a-col>
        </a-row>

        <a-divider />

        <a-row :gutter="[12, 12]">
          <a-col :sm="12" :xs="24">
            <div class="integration-groups-panel__type-card" :style="{ backgroundColor: token.colorFillQuaternary }">
              <a-typography-text type="secondary">Ожидалось</a-typography-text>
              <span class="integration-groups-panel__type-value">{{ details.expectedType ?? "—" }}</span>
            </div>
          </a-col>
          <a-col :sm="12" :xs="24">
            <div class="integration-groups-panel__type-card" :style="{ backgroundColor: token.colorFillQuaternary }">
              <a-typography-text type="secondary">Пришло</a-typography-text>
              <span class="integration-groups-panel__type-value">{{ details.actualType ?? "—" }}</span>
            </div>
          </a-col>
        </a-row>
      </template>
    </a-card>
  </template>
</template>

<style scoped>
.integration-groups-panel__actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.integration-groups-panel__table :deep(.ant-table-row) {
  cursor: pointer;
}

.integration-groups-panel__pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.integration-groups-panel__back {
  margin-bottom: 8px;
  padding-inline: 0;
}

.integration-groups-panel__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 16px;
}

.integration-groups-panel__head-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.integration-groups-panel__meta {
  align-items: center;
  display: flex;
  gap: 8px;
}

.integration-groups-panel__version {
  font-size: 18px;
  font-weight: 600;
}

.integration-groups-panel__field {
  margin: 0;
}

.integration-groups-panel__stats {
  margin-bottom: 8px;
}

.integration-groups-panel__stats .ant-col {
  margin-bottom: 8px;
}

.integration-groups-panel__stat-date :deep(.ant-statistic-content) {
  font-size: 16px;
}

.integration-groups-panel__type-card {
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
}

.integration-groups-panel__type-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 18px;
  line-height: 1.2;
}
</style>
