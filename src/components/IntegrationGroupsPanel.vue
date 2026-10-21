<script setup lang="ts">
import type { TableColumnsType } from "ant-design-vue";

import { ArrowLeftOutlined, ReloadOutlined } from "@ant-design/icons-vue";
import { useQuery } from "@tanstack/vue-query";
import { computed, ref } from "vue";

import type { ViolationGroup } from "@/api/violation-groups";

import { ApiError } from "@/api/client";
import { getViolationGroup, getViolationGroups } from "@/api/violation-groups";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{ integrationId: string }>();

const authStore = useAuthStore();
const integrationId = computed(() => props.integrationId);

const pageSize = 20;

const descriptionsColumn = { lg: 2, md: 2, sm: 1, xl: 2, xs: 1, xxl: 2 };

const columns: TableColumnsType<ViolationGroup> = [
  { dataIndex: "fieldName", key: "fieldName", title: "Поле" },
  { dataIndex: "type", key: "type", title: "Нарушение" },
  { key: "contract", title: "Код контракта" },
  { dataIndex: "contractVersion", key: "contractVersion", title: "Версия контракта" },
  { dataIndex: "occurrenceCount", key: "occurrenceCount", title: "Повторов" },
  { key: "lastSeenAt", title: "Последнее появление" },
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
  <a-card v-if="!selectedGroupId" title="Группы нарушений">
    <template #extra>
      <a-button :loading="isFetching" @click="refetch()">
        <template #icon>
          <ReloadOutlined />
        </template>
        Обновить
      </a-button>
    </template>

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
            <a-tag color="error">{{ details.type }}</a-tag>
          </div>
          <a-typography-text type="secondary">
            {{ details.contractSlug ?? "—" }} · v{{ details.contractVersion }}
          </a-typography-text>
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

        <a-descriptions bordered :column="descriptionsColumn" size="small">
          <a-descriptions-item label="Ожидалось">
            <a-typography-text code>{{ details.expectedType ?? "—" }}</a-typography-text>
          </a-descriptions-item>
          <a-descriptions-item label="Пришло">
            <a-typography-text code>{{ details.actualType ?? "—" }}</a-typography-text>
          </a-descriptions-item>
        </a-descriptions>
      </template>
    </a-card>
  </template>
</template>

<style scoped>
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
</style>
