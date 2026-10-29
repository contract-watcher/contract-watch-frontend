<script setup lang="ts">
import type { Dayjs } from "dayjs";

import { ArrowRightOutlined, ClockCircleOutlined, ReloadOutlined } from "@ant-design/icons-vue";
import { keepPreviousData, useQuery } from "@tanstack/vue-query";
import { theme } from "ant-design-vue";
import dayjs from "dayjs";
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

import type { Integration } from "@/api/integrations";
import type { ProjectSummaryItem } from "@/api/project-summary";

import { ApiError } from "@/api/client";
import { getProjectIntegrationSummaries } from "@/api/project-summary";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{ integrations: Integration[]; projectId: string; resetKey?: number }>();

const authStore = useAuthStore();
const router = useRouter();
const { token } = theme.useToken();
const projectId = computed(() => props.projectId);

const PAGE_SIZE = 10;

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
const selectedIntegrationIds = ref<string[]>([]);
const onlyFailed = ref(false);
const page = ref(1);

const hasPeriod = computed(() => Boolean(selectedRange.value?.[0] && selectedRange.value[1]));

const periodQuery = computed<{ from?: string; to?: string }>(() => {
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

const integrationOptions = computed(() =>
  props.integrations.map((integration) => ({
    label: integration.name,
    value: integration.id,
  })),
);

const {
  data,
  error: queryError,
  isError,
  isFetching,
  isPending,
  refetch,
} = useQuery({
  queryKey: ["project-integration-summaries", projectId, periodQuery, onlyFailed, selectedIntegrationIds, page],
  queryFn: () =>
    getProjectIntegrationSummaries(
      projectId.value,
      {
        ...periodQuery.value,
        integrationId: selectedIntegrationIds.value,
        limit: PAGE_SIZE,
        offset: (page.value - 1) * PAGE_SIZE,
        onlyFailed: onlyFailed.value,
      },
      authStore.accessToken,
    ),
  placeholderData: keepPreviousData,
});

const rows = computed(() => data.value?.items ?? []);
const total = computed(() => data.value?.total ?? 0);

const emptyDescription = computed(() =>
  onlyFailed.value ? "Нет интеграций с Failed за выбранный период" : "Интеграций пока нет",
);

watch(
  [selectedRange, onlyFailed, selectedIntegrationIds],
  () => {
    page.value = 1;
  },
  { deep: true },
);

watch(
  () => props.projectId,
  () => {
    page.value = 1;
    selectedIntegrationIds.value = [];
  },
);

watch(
  () => props.resetKey,
  () => {
    page.value = 1;
    selectedIntegrationIds.value = [];
    onlyFailed.value = false;
  },
);

function getFieldError(error: unknown, field: string): string | undefined {
  if (!(error instanceof ApiError) || !error.fieldErrors) {
    return undefined;
  }

  const key = Object.keys(error.fieldErrors).find((name) => name.toLowerCase() === field.toLowerCase());
  return key ? error.fieldErrors[key]?.[0] : undefined;
}

const integrationFilterError = computed(() =>
  getFieldError(queryError.value, "IntegrationId") ? "Выберите не больше 100 интеграций" : undefined,
);
const periodFilterError = computed(() =>
  (getFieldError(queryError.value, "From") ?? getFieldError(queryError.value, "To"))
    ? "Проверьте границы периода"
    : undefined,
);
const isValidationError = computed(() => queryError.value instanceof ApiError && queryError.value.status === 400);

const errorMessage = computed(() => {
  if (!(queryError.value instanceof ApiError)) {
    return "Не удалось загрузить сводку по интеграциям";
  }

  if (queryError.value.status === 400) {
    return "Проверьте параметры фильтра";
  }
  if (queryError.value.status === 503) {
    return "Не удалось получить данные из Monitoring, попробуйте позже";
  }
  return queryError.value.status === 404 ? "Проект не найден" : queryError.value.message;
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

function passRate(record: ProjectSummaryItem): number {
  return record.totalReports > 0 ? Math.round((record.passedReports / record.totalReports) * 100) : 0;
}

function passRateColor(record: ProjectSummaryItem): string {
  return record.failedReports > 0 ? token.value.colorError : token.value.colorSuccess;
}

function openIntegration(integrationId: string): void {
  void router.push({
    name: "project-integration",
    params: { integrationId, projectId: projectId.value },
  });
}
</script>

<template>
  <section class="project-summary-panel">
    <div
      class="project-summary-panel__filters"
      :style="{ backgroundColor: token.colorFillQuaternary, borderColor: token.colorBorderSecondary }"
    >
      <div class="project-summary-panel__field">
        <a-typography-text class="project-summary-panel__label" type="secondary">Период</a-typography-text>
        <a-range-picker
          v-model:value="selectedRange"
          class="project-summary-panel__range"
          format="DD.MM.YYYY"
          :placeholder="['Дата с', 'Дата по']"
          :presets="rangePresets"
        />
      </div>
      <div class="project-summary-panel__field">
        <a-typography-text class="project-summary-panel__label" type="secondary">Интеграции</a-typography-text>
        <a-select
          v-model:value="selectedIntegrationIds"
          allow-clear
          class="project-summary-panel__integrations"
          :max-tag-count="1"
          mode="multiple"
          :not-found-content="'Интеграции не найдены'"
          option-filter-prop="label"
          :options="integrationOptions"
          placeholder="Все интеграции"
        />
      </div>
      <div class="project-summary-panel__field project-summary-panel__field--status">
        <a-typography-text class="project-summary-panel__label" type="secondary">Статус</a-typography-text>
        <a-checkbox v-model:checked="onlyFailed">Только с Failed</a-checkbox>
      </div>
    </div>

    <a-typography-text v-if="integrationFilterError" class="project-summary-panel__filter-error" type="danger">
      {{ integrationFilterError }}
    </a-typography-text>
    <a-typography-text v-if="periodFilterError" class="project-summary-panel__filter-error" type="danger">
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

    <a-skeleton v-else-if="isPending" active :paragraph="{ rows: 7 }" />

    <template v-else>
      <a-spin :spinning="isFetching">
        <div v-if="rows.length > 0" class="project-summary-panel__grid">
          <a-card
            v-for="record in rows"
            :key="record.integrationId"
            :aria-label="`Открыть интеграцию ${record.name}`"
            class="project-summary-panel__card"
            hoverable
            role="link"
            tabindex="0"
            @click="openIntegration(record.integrationId)"
            @keydown.enter="openIntegration(record.integrationId)"
            @keydown.space.prevent="openIntegration(record.integrationId)"
          >
            <div class="project-summary-panel__card-head">
              <div class="project-summary-panel__names">
                <span class="project-summary-panel__card-title">{{ record.name }}</span>
                <a-typography-text code type="secondary">{{ record.slug }}</a-typography-text>
              </div>
            </div>

            <div class="project-summary-panel__stats" :style="{ backgroundColor: token.colorFillQuaternary }">
              <div class="project-summary-panel__stat">
                <span>Всего</span>
                <strong>{{ record.totalReports }}</strong>
              </div>
              <div class="project-summary-panel__stat">
                <span>Passed</span>
                <strong :style="{ color: record.passedReports > 0 ? token.colorSuccess : undefined }">
                  {{ record.passedReports }}
                </strong>
              </div>
              <div class="project-summary-panel__stat">
                <span>Failed</span>
                <strong :style="{ color: record.failedReports > 0 ? token.colorError : undefined }">
                  {{ record.failedReports }}
                </strong>
              </div>
            </div>

            <div v-if="record.totalReports > 0" class="project-summary-panel__progress">
              <a-progress
                :percent="passRate(record)"
                :show-info="false"
                :stroke-color="passRateColor(record)"
                size="small"
              />
              <a-typography-text type="secondary">{{ passRate(record) }}% успешных</a-typography-text>
            </div>
            <a-typography-text v-else class="project-summary-panel__no-data" type="secondary">
              За период проверок нет
            </a-typography-text>

            <div class="project-summary-panel__card-footer">
              <span class="project-summary-panel__last-check">
                <ClockCircleOutlined />
                <a-typography-text v-if="record.lastReceivedAt" type="secondary">
                  {{ formatDateTime(record.lastReceivedAt) }}
                </a-typography-text>
                <a-typography-text v-else type="secondary">—</a-typography-text>
              </span>
              <a-tooltip title="Открыть интеграцию">
                <span class="project-summary-panel__open" :style="{ color: token.colorPrimary }">
                  <ArrowRightOutlined />
                </span>
              </a-tooltip>
            </div>
          </a-card>
        </div>

        <a-empty v-else :description="emptyDescription" />
      </a-spin>

      <a-pagination
        v-model:current="page"
        class="project-summary-panel__pagination"
        :hide-on-single-page="true"
        :page-size="PAGE_SIZE"
        :show-size-changer="false"
        :total="total"
        show-less-items
      />
    </template>
  </section>
</template>

<style scoped>
.project-summary-panel {
  margin-bottom: 24px;
}

.project-summary-panel__filters {
  align-items: flex-end;
  border: 1px solid;
  border-radius: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
  padding: 12px;
}

.project-summary-panel__field {
  display: flex;
  flex: 0 1 auto;
  flex-direction: column;
  gap: 6px;
}

.project-summary-panel__field--status {
  padding-bottom: 4px;
}

.project-summary-panel__label {
  font-size: 12px;
}

.project-summary-panel__range {
  width: 280px;
}

.project-summary-panel__integrations {
  width: 220px;
}

.project-summary-panel__filter-error {
  display: block;
  margin-bottom: 12px;
  margin-top: -4px;
}

.project-summary-panel__grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.project-summary-panel__card {
  border-radius: 12px;
  cursor: pointer;
}

.project-summary-panel__card-head {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.project-summary-panel__identity {
  align-items: center;
  display: flex;
  gap: 10px;
  min-width: 0;
}

.project-summary-panel__names {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.project-summary-panel__card-title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
}

.project-summary-panel__names :deep(.ant-typography) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-summary-panel__stats {
  border-radius: 10px;
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 16px;
  padding: 12px;
}

.project-summary-panel__stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.project-summary-panel__stat span {
  font-size: 12px;
}

.project-summary-panel__stat strong {
  font-size: 18px;
  line-height: 1.2;
}

.project-summary-panel__progress {
  align-items: center;
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.project-summary-panel__progress :deep(.ant-progress) {
  flex: 1;
  margin: 0;
}

.project-summary-panel__no-data {
  display: block;
  margin-top: 14px;
}

.project-summary-panel__card-footer {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  margin-top: 16px;
}

.project-summary-panel__last-check {
  align-items: center;
  display: flex;
  gap: 6px;
}

.project-summary-panel__open {
  align-items: center;
  display: inline-flex;
  font-size: 16px;
}

.project-summary-panel__pagination {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

@media (max-width: 767px) {
  .project-summary-panel__filters {
    align-items: stretch;
  }

  .project-summary-panel__field,
  .project-summary-panel__range,
  .project-summary-panel__integrations {
    width: 100%;
  }

  .project-summary-panel__grid {
    grid-template-columns: 1fr;
  }
}
</style>
